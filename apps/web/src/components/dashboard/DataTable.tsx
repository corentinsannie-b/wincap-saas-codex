import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface TableColumn {
  key: string;
  header: string;
  align?: "left" | "right";
  className?: string;
}

export interface TableRowData {
  cells: (string | ReactNode)[];
  type?: "normal" | "subtotal" | "total" | "indent";
  className?: string;
}

interface DataTableProps {
  columns: TableColumn[];
  rows: TableRowData[];
}

export const DataTable = ({ columns, rows }: DataTableProps) => {
  return (
    <div className="overflow-x-auto my-6">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            {columns.map((col, i) => (
              <TableHead 
                key={i} 
                className={cn(
                  "text-primary-foreground font-medium",
                  col.align === "right" && "text-right",
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow 
              key={rowIndex}
              className={cn(
                row.type === "subtotal" && "bg-secondary/50 font-semibold",
                row.type === "total" && "bg-primary text-primary-foreground font-bold",
                row.className
              )}
            >
              {row.cells.map((cell, cellIndex) => (
                <TableCell 
                  key={cellIndex}
                  className={cn(
                    columns[cellIndex]?.align === "right" && "text-right",
                    row.type === "indent" && cellIndex === 0 && "pl-8",
                    row.type === "total" && "border-none"
                  )}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
