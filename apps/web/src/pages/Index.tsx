import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { Commentary } from "@/components/dashboard/Commentary";
import { AlertBox } from "@/components/dashboard/AlertBox";
import { DataTable, TableColumn, TableRowData } from "@/components/dashboard/DataTable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

// Data
const clientsData = [
  { name: "Client A", value: 10 },
  { name: "Client B", value: 10 },
  { name: "Client C", value: 10 },
  { name: "Client D", value: 10 },
  { name: "Client E", value: 10 },
];

const suppliersData = [
  { name: "Supplier X", value: 6.67 },
  { name: "Supplier Y", value: 6.67 },
  { name: "Supplier Z", value: 6.67 },
  { name: "Landlord", value: 0.24 },
];

const monthlyBillingData = [
  { month: "Jan", value: 4.17 },
  { month: "Fév", value: 4.17 },
  { month: "Mar", value: 4.17 },
  { month: "Avr", value: 4.17 },
  { month: "Mai", value: 4.17 },
  { month: "Juin", value: 4.17 },
  { month: "Juil", value: 4.17 },
  { month: "Aoû", value: 4.17 },
  { month: "Sep", value: 4.17 },
  { month: "Oct", value: 4.17 },
  { month: "Nov", value: 4.17 },
  { month: "Déc", value: 4.17 },
];

const costStructureData = [
  { name: "EBITDA (39,5%)", value: 39.5 },
  { name: "Achats (40,0%)", value: 40 },
  { name: "Personnel (20,0%)", value: 20 },
  { name: "Frais généraux (0,5%)", value: 0.5 },
];

const treasuryEvolutionData = [
  { month: "Jan", value: 1.9 },
  { month: "Fév", value: 3.8 },
  { month: "Mar", value: 5.7 },
  { month: "Avr", value: 7.6 },
  { month: "Mai", value: 9.5 },
  { month: "Juin", value: 11.4 },
  { month: "Juil", value: 13.3 },
  { month: "Aoû", value: 15.2 },
  { month: "Sep", value: 17.1 },
  { month: "Oct", value: 19.0 },
  { month: "Nov", value: 20.9 },
  { month: "Déc", value: 22.7 },
];

const CHART_COLORS = {
  primary: "hsl(168, 12%, 31%)",
  accent: "hsl(168, 14%, 42%)",
  success: "hsl(31, 43%, 49%)",
  muted: "hsl(171, 16%, 68%)",
  light: "hsl(173, 20%, 82%)",
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.muted, CHART_COLORS.light, "hsl(168, 8%, 55%)"];
const SUPPLIER_COLORS = [CHART_COLORS.success, "hsl(31, 50%, 60%)", "hsl(31, 60%, 70%)", CHART_COLORS.muted];
const COST_COLORS = [CHART_COLORS.success, CHART_COLORS.success, CHART_COLORS.primary, CHART_COLORS.muted];

const sections = [
  { id: "synthese", label: "Synthèse" },
  { id: "presentation", label: "Présentation" },
  { id: "performance", label: "Performance" },
  { id: "bilan", label: "Bilan" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "qoe", label: "QoE" },
  { id: "qod", label: "QoD" },
];

const Index = () => {
  const [activeSection, setActiveSection] = useState("synthese");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Confidential Banner */}
      <div className="bg-amber-100 text-amber-800 text-center py-2 text-sm font-medium">
        CONFIDENTIEL - Document destiné exclusivement aux parties impliquées dans la transaction
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-8 py-10 relative">
        <h1 className="text-4xl font-light tracking-tight mb-2">Due Diligence Financière</h1>
        <p className="text-lg opacity-90">CREDIBILE - Analyse financière FY24</p>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-right text-sm opacity-80">
          <div className="flex items-center gap-2 justify-end mb-1">
            <Calendar className="h-4 w-4" />
            Janvier 2025
          </div>
          <small>Source : FEC 2024</small>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card shadow-md sticky top-0 z-50 px-8 py-4">
        <ul className="flex gap-2 flex-wrap">
          {sections.map(section => (
            <li key={section.id}>
              <Button
                variant={activeSection === section.id ? "default" : "ghost"}
                size="sm"
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="max-w-[1400px] mx-auto p-8 space-y-10">

        {/* Table of Contents */}
        <Card className="bg-secondary/50">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-4 text-lg">Table des matières</h3>
            <ol className="grid grid-cols-2 gap-2 list-decimal list-inside text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button 
                    onClick={() => scrollToSection(s.id)}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {s.label === "Synthèse" ? "Synthèse et chiffres clés" : 
                     s.label === "Présentation" ? "Présentation de la Société" :
                     s.label === "Performance" ? "Performance historique (P&L)" :
                     s.label === "Bilan" ? "Bilan et BFR" :
                     s.label === "Cash Flow" ? "Analyse du Cash Flow" :
                     s.label === "QoE" ? "Quality of Earnings (QoE)" :
                     "Quality of Debt (QoD)"}
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* 1. SYNTHESE */}
        <section id="synthese">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={1} title="Synthèse et Chiffres Clés" />
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard value="50,0 M€" label="Chiffre d'affaires" sublabel="FY24" variant="primary" />
                <KPICard value="19,8 M€" label="EBITDA" sublabel="39,5% du CA" variant="accent" />
                <KPICard value="22,7 M€" label="Trésorerie" sublabel="Déc-24" variant="success" />
                <KPICard value="19,3 M€" label="EBIT" sublabel="38,5% du CA" variant="primary" />
              </div>

              <Commentary>
                <p className="mb-3"><strong className="text-primary">Credibile</strong> est une société de <strong>prestations de services</strong> qui affiche une performance financière remarquable sur l'exercice 2024. La société génère un chiffre d'affaires de <span className="text-[hsl(31,43%,49%)] font-semibold">50,0 M€</span> avec une régularité mensuelle exemplaire (environ 4,17 M€/mois).</p>
                <p className="mb-3">La structure de coûts est maîtrisée avec une <strong>marge brute de 60%</strong> (30 M€) après déduction des achats consommés (20 M€). Les charges de personnel représentent 20% du CA (10 M€), ce qui traduit un modèle opérationnel efficient pour une activité de services.</p>
                <p>L'<strong>EBITDA atteint 19,8 M€</strong>, soit une marge d'EBITDA de <span className="text-[hsl(31,43%,49%)] font-semibold">39,5%</span>, niveau exceptionnel pour une société de services. La trésorerie nette de <strong>22,7 M€</strong> témoigne d'une situation financière très saine, sans dette financière significative.</p>
              </Commentary>

              <h3 className="text-primary font-semibold text-lg mb-4">Points clés de l'analyse</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <AlertBox variant="success" title="Forces">
                  Marge EBITDA exceptionnelle (39,5%), trésorerie abondante, base clients diversifiée
                </AlertBox>
                <AlertBox variant="info" title="Points d'attention">
                  Concentration achats sur 3 fournisseurs, analyse N-1/N-2 non disponible
                </AlertBox>
                <AlertBox variant="warning" title="À approfondir">
                  Nature exacte des prestations, contrats clients, récurrence du CA
                </AlertBox>
              </div>

              <DataTable
                columns={[
                  { key: "indicator", header: "Indicateur" },
                  { key: "fy24", header: "FY24", align: "right" },
                  { key: "pct", header: "% CA", align: "right" },
                  { key: "comment", header: "Commentaire" },
                ]}
                rows={[
                  { cells: ["Chiffre d'affaires", <strong>50 000 k€</strong>, "100,0%", "5 clients (10 M€/client)"] },
                  { cells: ["Achats consommés", "(20 000) k€", "40,0%", "3 fournisseurs principaux"] },
                  { cells: [<strong>Marge brute</strong>, <strong>30 000 k€</strong>, "60,0%", ""], type: "subtotal" },
                  { cells: ["Charges de personnel", "(10 000) k€", "20,0%", "Salaires + charges sociales"] },
                  { cells: ["Frais généraux", "(240) k€", "0,5%", "Loyers uniquement"] },
                  { cells: ["EBITDA", "19 760 k€", "39,5%", ""], type: "total" },
                  { cells: ["D&A", "(500) k€", "1,0%", ""] },
                  { cells: [<strong>EBIT</strong>, <strong>19 260 k€</strong>, "38,5%", ""], type: "subtotal" },
                ]}
              />
              <p className="text-muted-foreground text-sm italic">Source : FEC 2024 (622 écritures comptables)</p>
            </CardContent>
          </Card>
        </section>

        {/* 2. PRESENTATION */}
        <section id="presentation">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={2} title="Présentation de la Société" />
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-primary font-semibold mb-4">Informations générales</h3>
                  <DataTable
                    columns={[
                      { key: "field", header: "Champ" },
                      { key: "value", header: "Valeur" },
                    ]}
                    rows={[
                      { cells: [<strong>Raison sociale</strong>, "Credibile"] },
                      { cells: [<strong>Activité</strong>, "Prestations de services (compte 706)"] },
                      { cells: [<strong>Exercice analysé</strong>, "FY24 (Jan-Déc 2024)"] },
                      { cells: [<strong>Source données</strong>, "FEC (Fichier des Écritures Comptables)"] },
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-primary font-semibold mb-4">Structure des tiers</h3>
                  <DataTable
                    columns={[
                      { key: "field", header: "Champ" },
                      { key: "value", header: "Valeur" },
                    ]}
                    rows={[
                      { cells: [<strong>Clients</strong>, "5 clients (A, B, C, D, E)"] },
                      { cells: [<strong>CA moyen/client</strong>, "10 M€/an"] },
                      { cells: [<strong>Fournisseurs</strong>, "3 principaux + 1 bailleur"] },
                      { cells: [<strong>Banque</strong>, "1 compte (512000)"] },
                    ]}
                  />
                </div>
              </div>

              <Commentary>
                <p className="mb-3"><strong className="text-primary">Credibile</strong> opère dans le secteur des <strong>prestations de services</strong>, comme en témoigne l'utilisation exclusive du compte 706000 pour la comptabilisation du chiffre d'affaires. L'activité présente une forte régularité avec une facturation mensuelle constante de 4,17 M€.</p>
                <p className="mb-3">La société travaille avec <strong>5 clients</strong> de taille équivalente (chacun représentant 20% du CA soit 10 M€/an), ce qui suggère une diversification satisfaisante du portefeuille clients.</p>
                <p>La structure opérationnelle est légère : pas de stocks, pas d'en-cours de production, des immobilisations limitées aux amortissements courants. Ce profil est caractéristique d'une <strong>société de services pure</strong>.</p>
              </Commentary>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-primary font-semibold mb-4">Répartition du CA par client</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clientsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name }) => name}
                        >
                          {clientsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h3 className="text-primary font-semibold mb-4">Répartition des achats par fournisseur</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={suppliersData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name }) => name}
                        >
                          {suppliersData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={SUPPLIER_COLORS[index % SUPPLIER_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. PERFORMANCE */}
        <section id="performance">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={3} title="Performance Historique - Compte de Résultat" />
            <CardContent className="p-8">
              <Commentary>
                <p className="mb-3">Sur l'exercice FY24, <strong className="text-primary">Credibile</strong> affiche un chiffre d'affaires de <span className="text-[hsl(31,43%,49%)] font-semibold">50,0 M€</span> intégralement composé de prestations de services. La facturation est parfaitement linéaire sur l'année.</p>
                <p className="mb-3">Les <strong>achats consommés</strong> représentent 40% du CA (20 M€), positionnant la marge brute à 60%. Les <strong>charges de personnel</strong> s'élèvent à 10 M€ (20% du CA).</p>
                <p>Les <strong>frais généraux</strong> sont limités aux loyers (240 k€/an). L'EBITDA résultant de <span className="text-[hsl(31,43%,49%)] font-semibold">19,8 M€</span> représente une marge exceptionnelle de 39,5%.</p>
              </Commentary>

              <h3 className="text-primary font-semibold mb-4">Compte de Résultat détaillé - FY24</h3>
              <DataTable
                columns={[
                  { key: "libelle", header: "Libellé" },
                  { key: "fy24", header: "FY24 (k€)", align: "right" },
                  { key: "pct", header: "% CA", align: "right" },
                  { key: "analyse", header: "Analyse" },
                ]}
                rows={[
                  { cells: [<strong>Chiffre d'affaires</strong>, <strong>50 000</strong>, "100,0%", "Prestations de services (706)"] },
                  { cells: ["dont Client A", "10 000", "20,0%", ""], type: "indent" },
                  { cells: ["dont Client B", "10 000", "20,0%", ""], type: "indent" },
                  { cells: ["dont Client C", "10 000", "20,0%", ""], type: "indent" },
                  { cells: ["dont Client D", "10 000", "20,0%", ""], type: "indent" },
                  { cells: ["dont Client E", "10 000", "20,0%", ""], type: "indent" },
                  { cells: [<strong>Achats consommés</strong>, <span className="text-destructive">(20 000)</span>, "40,0%", "Achats non stockés (606)"] },
                  { cells: ["Supplier X", "(6 667)", "13,3%", ""], type: "indent" },
                  { cells: ["Supplier Y", "(6 667)", "13,3%", ""], type: "indent" },
                  { cells: ["Supplier Z", "(6 667)", "13,3%", ""], type: "indent" },
                  { cells: [<strong>Marge brute</strong>, <strong>30 000</strong>, <strong>60,0%</strong>, ""], type: "subtotal" },
                  { cells: [<strong>Charges de personnel</strong>, <span className="text-destructive">(10 000)</span>, "20,0%", ""] },
                  { cells: ["Salaires bruts (641)", "(8 000)", "16,0%", ""], type: "indent" },
                  { cells: ["Charges sociales (645)", "(2 000)", "4,0%", "25% des salaires bruts"], type: "indent" },
                  { cells: [<strong>Frais généraux</strong>, <span className="text-destructive">(240)</span>, "0,5%", ""] },
                  { cells: ["Loyers (613)", "(240)", "0,5%", "20 k€/mois"], type: "indent" },
                  { cells: [<strong>EBITDA</strong>, <strong>19 760</strong>, <strong>39,5%</strong>, ""], type: "total" },
                  { cells: ["D&A (681)", <span className="text-destructive">(500)</span>, "1,0%", "Dotations aux amortissements"] },
                  { cells: [<strong>EBIT</strong>, <strong>19 260</strong>, <strong>38,5%</strong>, ""], type: "subtotal" },
                ]}
              />

              <h3 className="text-primary font-semibold mt-8 mb-4">Facturation mensuelle</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBillingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.light} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 5]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: CHART_COLORS.primary, border: "none", borderRadius: "6px", color: "white" }}
                    />
                    <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="Facturation (M€)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Commentary>
                <p className="mb-2">La facturation mensuelle est parfaitement stable à <strong>4,17 M€/mois</strong>, ce qui suggère soit des contrats à facturation régulière, soit une activité récurrente très prévisible.</p>
                <p>Cette régularité est un <strong>point fort</strong> pour la valorisation car elle réduit le risque de volatilité.</p>
              </Commentary>

              <h3 className="text-primary font-semibold mt-8 mb-4">Structure des coûts</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costStructureData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      {costStructureData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? CHART_COLORS.success : index === 1 ? CHART_COLORS.success : index === 2 ? CHART_COLORS.primary : CHART_COLORS.muted} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. BILAN */}
        <section id="bilan">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={4} title="Bilan et Besoin en Fonds de Roulement" />
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard value="5,0 M€" label="Créances clients" sublabel="30 jours de CA TTC" variant="primary" />
                <KPICard value="2,0 M€" label="Dettes fournisseurs" sublabel="30 jours d'achats TTC" variant="accent" />
                <KPICard value="22,7 M€" label="Trésorerie" sublabel="45% du CA annuel" variant="success" />
                <KPICard value="3,0 M€" label="BFR opérationnel" sublabel="6% du CA" variant="primary" />
              </div>

              <Commentary>
                <p className="mb-3">Le bilan de <strong className="text-primary">Credibile</strong> au 31 décembre 2024 présente une structure très saine, caractéristique d'une société de services sans actifs immobilisés significatifs.</p>
                <p className="mb-3">Les <strong>créances clients</strong> s'élèvent à 5 M€, correspondant à 30 jours de CA TTC (DSO). Les <strong>dettes fournisseurs</strong> de 2 M€ représentent également 30 jours d'achats TTC (DPO).</p>
                <p>Le <strong>BFR opérationnel</strong> de 3 M€ (6% du CA) est très modéré pour une activité de services, attestant d'une bonne gestion du cycle d'exploitation.</p>
              </Commentary>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-primary font-semibold mb-4">Actif</h3>
                  <DataTable
                    columns={[
                      { key: "poste", header: "Poste" },
                      { key: "montant", header: "Montant", align: "right" },
                    ]}
                    rows={[
                      { cells: ["Immobilisations nettes", "4 500 k€"] },
                      { cells: ["Créances clients", "5 000 k€"] },
                      { cells: ["TVA déductible", "(952) k€"] },
                      { cells: [<strong>Actif circulant</strong>, <strong>4 048 k€</strong>], type: "subtotal" },
                      { cells: ["Trésorerie", "22 712 k€"] },
                      { cells: [<strong>TOTAL ACTIF</strong>, <strong>31 260 k€</strong>], type: "total" },
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-primary font-semibold mb-4">Passif</h3>
                  <DataTable
                    columns={[
                      { key: "poste", header: "Poste" },
                      { key: "montant", header: "Montant", align: "right" },
                    ]}
                    rows={[
                      { cells: ["Résultat de l'exercice", "19 260 k€"] },
                      { cells: [<strong>Capitaux propres</strong>, <strong>19 260 k€</strong>], type: "subtotal" },
                      { cells: ["Dettes fournisseurs", "2 000 k€"] },
                      { cells: ["TVA collectée", "10 000 k€"] },
                      { cells: ["Dettes sociales", "0 k€"] },
                      { cells: [<strong>Dettes</strong>, <strong>12 000 k€</strong>], type: "subtotal" },
                      { cells: [<strong>TOTAL PASSIF</strong>, <strong>31 260 k€</strong>], type: "total" },
                    ]}
                  />
                </div>
              </div>

              <h3 className="text-primary font-semibold mb-4">Analyse du BFR</h3>
              <DataTable
                columns={[
                  { key: "composante", header: "Composante" },
                  { key: "montant", header: "Montant (k€)", align: "right" },
                  { key: "jours", header: "Jours", align: "right" },
                  { key: "commentaire", header: "Commentaire" },
                ]}
                rows={[
                  { cells: ["Créances clients", "5 000", "30 j", "DSO conforme aux délais légaux"] },
                  { cells: ["Dettes fournisseurs", "(2 000)", "30 j", "DPO équilibré"] },
                  { cells: [<strong>BFR opérationnel</strong>, <strong>3 000</strong>, "-", "6% du CA - très modéré"], type: "subtotal" },
                  { cells: ["TVA nette", "(5 952)", "-", "Position créditrice envers l'État"] },
                  { cells: [<strong>BFR total</strong>, <strong>(2 952)</strong>, "-", "Position favorable"], type: "total" },
                ]}
              />

              <AlertBox variant="success" title="Point favorable">
                Le BFR opérationnel de 3 M€ (6% du CA) est très contenu. La TVA nette créditrice (-6 M€) génère un BFR total négatif, source de financement gratuite.
              </AlertBox>
            </CardContent>
          </Card>
        </section>

        {/* 5. CASH FLOW */}
        <section id="cashflow">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={5} title="Analyse du Cash Flow" />
            <CardContent className="p-8">
              <Commentary>
                <p className="mb-3">L'analyse du cash flow de <strong className="text-primary">Credibile</strong> met en évidence une forte capacité de génération de trésorerie. L'EBITDA de <span className="text-[hsl(31,43%,49%)] font-semibold">19,8 M€</span> se convertit quasi intégralement en cash opérationnel.</p>
                <p className="mb-3">La trésorerie de clôture de <strong>22,7 M€</strong> témoigne de la remarquable performance de conversion du résultat en cash.</p>
                <p>Le <strong>free cash flow</strong> estimé avoisine les 19 M€, soit un taux de conversion EBITDA/FCF proche de 95%, niveau exceptionnel.</p>
              </Commentary>

              <h3 className="text-primary font-semibold mb-4">Tableau des flux de trésorerie simplifié - FY24</h3>
              <DataTable
                columns={[
                  { key: "libelle", header: "Libellé" },
                  { key: "fy24", header: "FY24 (k€)", align: "right" },
                  { key: "commentaire", header: "Commentaire" },
                ]}
                rows={[
                  { cells: [<strong>EBITDA</strong>, <strong>19 760</strong>, ""] },
                  { cells: ["Variation créances clients", <span className="text-destructive">(5 000)</span>, "Constitution du poste clients"] },
                  { cells: ["Variation dettes fournisseurs", <span className="text-emerald-600">2 000</span>, "Constitution du crédit fournisseurs"] },
                  { cells: ["Variation BFR opérationnel", <span className="text-destructive">(3 000)</span>, ""] },
                  { cells: ["Variation TVA nette", <span className="text-emerald-600">5 952</span>, "Source de financement"] },
                  { cells: [<strong>Flux opérationnel avant IS</strong>, <strong>22 712</strong>, ""], type: "subtotal" },
                  { cells: ["Impôt sur les sociétés", "0", "Non visible dans le FEC"] },
                  { cells: ["CAPEX", "0", "Pas d'investissement"] },
                  { cells: [<strong>Free Cash Flow</strong>, <strong>22 712</strong>, ""], type: "total" },
                  { cells: ["Trésorerie d'ouverture", "0", ""] },
                  { cells: [<strong>Trésorerie de clôture</strong>, <strong>22 712</strong>, "Compte 512"], type: "subtotal" },
                ]}
              />

              <h3 className="text-primary font-semibold mt-8 mb-4">Évolution de la trésorerie mensuelle</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={treasuryEvolutionData}>
                    <defs>
                      <linearGradient id="colorTreasury" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.light} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: CHART_COLORS.primary, border: "none", borderRadius: "6px", color: "white" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={CHART_COLORS.success} 
                      strokeWidth={2}
                      fill="url(#colorTreasury)" 
                      name="Trésorerie (M€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <AlertBox variant="info" title="Note méthodologique">
                L'analyse du cash flow est réalisée à partir des mouvements du compte 512 (Banque). Les encaissements clients et décaissements fournisseurs sont reconstitués à partir des écritures de règlement.
              </AlertBox>
            </CardContent>
          </Card>
        </section>

        {/* 6. QoE */}
        <section id="qoe">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={6} title="Quality of Earnings (QoE)" />
            <CardContent className="p-8">
              <Commentary>
                <p className="mb-3">L'analyse de la <strong>Quality of Earnings</strong> vise à identifier les éléments non récurrents ou exceptionnels qui pourraient affecter la pertinence de l'EBITDA pour la valorisation.</p>
                <p className="mb-3">Dans le cas de <strong className="text-primary">Credibile</strong>, l'EBITDA reporté de <span className="text-[hsl(31,43%,49%)] font-semibold">19,8 M€</span> ne nécessite <strong>aucun ajustement significatif</strong> :</p>
                <ul className="list-disc ml-6 mb-3 space-y-1">
                  <li>Pas d'éléments exceptionnels identifiés dans le FEC</li>
                  <li>Pas de charges ou produits non récurrents</li>
                  <li>Structure de coûts stable et récurrente</li>
                  <li>Pas de changement de méthode comptable apparent</li>
                </ul>
                <p>L'<strong>EBITDA ajusté</strong> est donc égal à l'EBITDA reporté, ce qui renforce la qualité du résultat présenté.</p>
              </Commentary>

              <h3 className="text-primary font-semibold mb-4">Tableau de réconciliation QoE</h3>
              <DataTable
                columns={[
                  { key: "libelle", header: "Libellé" },
                  { key: "fy24", header: "FY24 (k€)", align: "right" },
                  { key: "commentaire", header: "Commentaire" },
                ]}
                rows={[
                  { cells: [<strong>EBITDA reporté</strong>, <strong>19 760</strong>, ""] },
                  { cells: ["Ajustements :", "", ""] },
                  { cells: ["Éléments non récurrents", "0", "Aucun identifié"], type: "indent" },
                  { cells: ["Changements de méthode", "0", "Aucun identifié"], type: "indent" },
                  { cells: ["Charges exceptionnelles", "0", "Aucune identifiée"], type: "indent" },
                  { cells: [<strong>Total ajustements</strong>, <strong>0</strong>, ""], type: "subtotal" },
                  { cells: [<strong>EBITDA ajusté</strong>, <strong>19 760</strong>, "= EBITDA reporté"], type: "total" },
                ]}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <AlertBox variant="success" title="Point favorable">
                  Aucun ajustement QoE nécessaire. L'EBITDA de 19,8 M€ est intégralement récurrent et peut servir de base à la valorisation.
                </AlertBox>
                <AlertBox variant="warning" title="Éléments à considérer">
                  La rémunération des dirigeants n'est pas visible dans le FEC. À confirmer si elle est incluse dans les charges de personnel.
                </AlertBox>
              </div>

              <h3 className="text-primary font-semibold mt-8 mb-4">Marge EBITDA</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "FY24", reported: 19.76, adjusted: 19.76 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.light} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 25]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: CHART_COLORS.primary, border: "none", borderRadius: "6px", color: "white" }}
                    />
                    <Legend />
                    <Bar dataKey="reported" fill={CHART_COLORS.primary} name="EBITDA reporté (M€)" />
                    <Bar dataKey="adjusted" fill={CHART_COLORS.success} name="EBITDA ajusté (M€)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 7. QoD */}
        <section id="qod">
          <Card className="overflow-hidden shadow-lg">
            <SectionHeader number={7} title="Quality of Debt (QoD) - Trésorerie Nette" />
            <CardContent className="p-8">
              <Commentary>
                <p className="mb-3">L'analyse de la <strong>Quality of Debt</strong> vise à déterminer la trésorerie nette ajustée disponible pour l'acquéreur à la date de closing.</p>
                <p className="mb-3">Au 31 décembre 2024, <strong className="text-primary">Credibile</strong> présente une trésorerie brute de <span className="text-[hsl(31,43%,49%)] font-semibold">22,7 M€</span> sans dette financière identifiable.</p>
                <p>Les principaux ajustements à considérer :</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li><strong>TVA à décaisser</strong> : La TVA nette créditrice de 6 M€ devra être versée à l'État</li>
                  <li><strong>IS estimé</strong> : Sur la base d'un résultat imposable de ~19 M€, provision à constituer</li>
                  <li><strong>Saisonnalité BFR</strong> : À analyser sur historique plus long</li>
                </ul>
              </Commentary>

              <h3 className="text-primary font-semibold mb-4">Tableau de réconciliation QoD</h3>
              <DataTable
                columns={[
                  { key: "libelle", header: "Libellé" },
                  { key: "dec24", header: "Déc-24 (k€)", align: "right" },
                  { key: "commentaire", header: "Commentaire" },
                ]}
                rows={[
                  { cells: [<strong>Trésorerie brute</strong>, <strong>22 712</strong>, "Compte 512"] },
                  { cells: ["Emprunts bancaires", "0", "Aucun identifié"] },
                  { cells: ["Comptes courants d'associés", "0", "Aucun identifié"] },
                  { cells: [<strong>Trésorerie nette</strong>, <strong>22 712</strong>, ""], type: "subtotal" },
                  { cells: ["Ajustements :", "", ""] },
                  { cells: ["(1) TVA à décaisser", <span className="text-destructive">(5 952)</span>, "TVA nette créditrice"], type: "indent" },
                  { cells: ["(2) IS estimé à provisionner", <span className="text-destructive">(4 815)</span>, "~25% du résultat avant IS"], type: "indent" },
                  { cells: ["(3) Saisonnalité BFR", "0", "Non applicable (1 an de données)"], type: "indent" },
                  { cells: [<strong>Total ajustements</strong>, <strong className="text-destructive">(10 767)</strong>, ""], type: "subtotal" },
                  { cells: [<strong>Trésorerie nette ajustée</strong>, <strong>11 945</strong>, "Cash disponible au closing"], type: "total" },
                ]}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <KPICard value="22,7 M€" label="Trésorerie brute" variant="primary" />
                <KPICard value="(10,8) M€" label="Ajustements QoD" variant="accent" />
                <KPICard value="11,9 M€" label="Trésorerie nette ajustée" variant="success" />
              </div>

              <div className="mt-6">
                <AlertBox variant="info" title="Note importante">
                  Les ajustements QoD sont des estimations basées sur les données disponibles dans le FEC. Une analyse complémentaire des liasses fiscales, des avis d'imposition et des déclarations de TVA permettrait d'affiner ces montants.
                </AlertBox>
              </div>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground text-center py-8 mt-10">
        <p className="opacity-90">Due Diligence Financière - Credibile - Janvier 2025</p>
        <p className="text-sm opacity-70 mt-2">Document généré automatiquement à partir du FEC</p>
      </footer>
    </div>
  );
};

export default Index;
