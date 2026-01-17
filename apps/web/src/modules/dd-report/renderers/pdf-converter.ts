/**
 * PDF Converter Module
 * ====================
 * Converts PPTX files to PDF using LibreOffice CLI
 * Server-side utility for Node.js environments
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

/**
 * Validate and sanitize file path to prevent command injection
 */
function sanitizePath(inputPath: string): string {
  // Resolve to absolute path
  const resolved = path.resolve(inputPath);

  // Check for null bytes (common injection vector)
  if (resolved.includes('\0')) {
    throw new Error('Invalid path: contains null bytes');
  }

  return resolved;
}

// =============================================================================
// LibreOffice Detection
// =============================================================================

interface LibreOfficeInfo {
  path: string;
  version: string;
}

/**
 * Detect LibreOffice installation on the system
 */
export async function detectLibreOffice(): Promise<LibreOfficeInfo | null> {
  const possiblePaths = getPossibleLibreOfficePaths();

  for (const libreOfficePath of possiblePaths) {
    try {
      const { stdout } = await execFileAsync(libreOfficePath, ['--version']);
      const versionMatch = stdout.match(/LibreOffice\s+(\d+\.\d+\.\d+)/);

      if (versionMatch) {
        return {
          path: libreOfficePath,
          version: versionMatch[1],
        };
      }
    } catch {
      // Path doesn't exist or command failed, try next
    }
  }

  return null;
}

function getPossibleLibreOfficePaths(): string[] {
  const platform = os.platform();

  if (platform === 'darwin') {
    return [
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      '/usr/local/bin/soffice',
      'soffice',
    ];
  } else if (platform === 'linux') {
    return [
      '/usr/bin/soffice',
      '/usr/bin/libreoffice',
      '/usr/local/bin/soffice',
      '/opt/libreoffice/program/soffice',
      'soffice',
      'libreoffice',
    ];
  } else if (platform === 'win32') {
    return [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      'soffice',
    ];
  }

  return ['soffice', 'libreoffice'];
}

// =============================================================================
// PDF Conversion
// =============================================================================

export interface ConversionOptions {
  /** Input PPTX file path */
  inputPath: string;
  /** Output directory (defaults to same as input) */
  outputDir?: string;
  /** Custom output filename (without extension) */
  outputName?: string;
  /** LibreOffice executable path (auto-detected if not provided) */
  libreOfficePath?: string;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Convert PPTX to PDF using LibreOffice
 */
export async function convertPPTXtoPDF(options: ConversionOptions): Promise<ConversionResult> {
  const startTime = Date.now();

  try {
    // Validate input file exists
    if (!fs.existsSync(options.inputPath)) {
      return {
        success: false,
        error: `Input file not found: ${options.inputPath}`,
      };
    }

    // Detect or use provided LibreOffice path
    let libreOfficePath = options.libreOfficePath;
    if (!libreOfficePath) {
      const detected = await detectLibreOffice();
      if (!detected) {
        return {
          success: false,
          error: 'LibreOffice not found. Please install LibreOffice or provide the path manually.',
        };
      }
      libreOfficePath = detected.path;
    }

    // Determine output directory
    const inputDir = path.dirname(options.inputPath);
    const outputDir = options.outputDir || inputDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sanitize paths to prevent injection
    const sanitizedInputPath = sanitizePath(options.inputPath);
    const sanitizedOutputDir = sanitizePath(outputDir);

    // Build LibreOffice arguments
    // --headless: Run without GUI
    // --convert-to pdf: Convert to PDF format
    // --outdir: Output directory
    const args = [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', sanitizedOutputDir,
      sanitizedInputPath
    ];

    // Execute conversion using execFile (safer than exec with shell)
    const timeout = options.timeout || 60000;
    await execFileAsync(libreOfficePath, args, { timeout });

    // Determine output filename
    const inputBasename = path.basename(options.inputPath, path.extname(options.inputPath));
    const outputFilename = (options.outputName || inputBasename) + '.pdf';
    const expectedOutputPath = path.join(outputDir, inputBasename + '.pdf');
    const finalOutputPath = path.join(outputDir, outputFilename);

    // LibreOffice creates file with original name, rename if needed
    if (options.outputName && expectedOutputPath !== finalOutputPath) {
      if (fs.existsSync(expectedOutputPath)) {
        fs.renameSync(expectedOutputPath, finalOutputPath);
      }
    }

    // Verify output exists
    const actualOutputPath = fs.existsSync(finalOutputPath) ? finalOutputPath : expectedOutputPath;

    if (!fs.existsSync(actualOutputPath)) {
      return {
        success: false,
        error: 'Conversion completed but output file not found',
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      outputPath: actualOutputPath,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during conversion';

    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Convert PPTX buffer to PDF (uses temp files)
 */
export async function convertPPTXBufferToPDF(
  pptxBuffer: Buffer,
  outputFilename?: string
): Promise<{ success: boolean; pdfBuffer?: Buffer; error?: string }> {
  const tempDir = os.tmpdir();
  const tempId = `dd_report_${Date.now()}`;
  const tempPptxPath = path.join(tempDir, `${tempId}.pptx`);

  try {
    // Write buffer to temp file
    fs.writeFileSync(tempPptxPath, pptxBuffer);

    // Convert
    const result = await convertPPTXtoPDF({
      inputPath: tempPptxPath,
      outputDir: tempDir,
      outputName: outputFilename?.replace('.pdf', '') || tempId,
    });

    if (!result.success || !result.outputPath) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Read PDF buffer
    const pdfBuffer = fs.readFileSync(result.outputPath);

    // Cleanup temp files
    try {
      fs.unlinkSync(tempPptxPath);
      fs.unlinkSync(result.outputPath);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      pdfBuffer,
    };
  } catch (error) {
    // Cleanup on error
    try {
      if (fs.existsSync(tempPptxPath)) {
        fs.unlinkSync(tempPptxPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Batch Conversion
// =============================================================================

export interface BatchConversionOptions {
  inputPaths: string[];
  outputDir: string;
  libreOfficePath?: string;
  concurrency?: number;
}

export interface BatchConversionResult {
  total: number;
  successful: number;
  failed: number;
  results: ConversionResult[];
}

/**
 * Convert multiple PPTX files to PDF
 */
export async function batchConvertPPTXtoPDF(
  options: BatchConversionOptions
): Promise<BatchConversionResult> {
  const results: ConversionResult[] = [];
  const concurrency = options.concurrency || 1;

  // Process in batches for controlled concurrency
  for (let i = 0; i < options.inputPaths.length; i += concurrency) {
    const batch = options.inputPaths.slice(i, i + concurrency);
    const batchPromises = batch.map(inputPath =>
      convertPPTXtoPDF({
        inputPath,
        outputDir: options.outputDir,
        libreOfficePath: options.libreOfficePath,
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return {
    total: options.inputPaths.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

// =============================================================================
// Alternative: Browser-based PDF (for client-side)
// =============================================================================

/**
 * Note: For browser environments where LibreOffice is not available,
 * consider using one of these alternatives:
 *
 * 1. Server-side API endpoint that performs the conversion
 * 2. Third-party conversion services (CloudConvert, DocRaptor, etc.)
 * 3. Generate PDF directly using react-pdf or pdf-lib (limited formatting)
 *
 * Example server endpoint usage:
 *
 * async function convertViAPI(pptxBlob: Blob): Promise<Blob> {
 *   const formData = new FormData();
 *   formData.append('file', pptxBlob, 'report.pptx');
 *
 *   const response = await fetch('/api/convert-to-pdf', {
 *     method: 'POST',
 *     body: formData,
 *   });
 *
 *   return response.blob();
 * }
 */

// =============================================================================
// Utility: Check System Readiness
// =============================================================================

export interface SystemReadiness {
  libreOfficeInstalled: boolean;
  libreOfficeVersion?: string;
  libreOfficePath?: string;
  tempDirWritable: boolean;
  recommendations: string[];
}

/**
 * Check if the system is ready for PDF conversion
 */
export async function checkSystemReadiness(): Promise<SystemReadiness> {
  const recommendations: string[] = [];

  // Check LibreOffice
  const libreOffice = await detectLibreOffice();
  if (!libreOffice) {
    recommendations.push('Install LibreOffice: https://www.libreoffice.org/download/download/');
    if (os.platform() === 'darwin') {
      recommendations.push('On macOS: brew install --cask libreoffice');
    } else if (os.platform() === 'linux') {
      recommendations.push('On Ubuntu/Debian: sudo apt install libreoffice');
      recommendations.push('On CentOS/RHEL: sudo yum install libreoffice');
    }
  }

  // Check temp directory
  let tempDirWritable = false;
  try {
    const testFile = path.join(os.tmpdir(), `test_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    tempDirWritable = true;
  } catch {
    recommendations.push('Temp directory is not writable. Check permissions on: ' + os.tmpdir());
  }

  return {
    libreOfficeInstalled: !!libreOffice,
    libreOfficeVersion: libreOffice?.version,
    libreOfficePath: libreOffice?.path,
    tempDirWritable,
    recommendations,
  };
}
