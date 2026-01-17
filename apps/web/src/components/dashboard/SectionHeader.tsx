interface SectionHeaderProps {
  number: number;
  title: string;
}

export const SectionHeader = ({ number, title }: SectionHeaderProps) => {
  return (
    <div className="bg-primary text-primary-foreground px-8 py-5 flex items-center gap-4 rounded-t-lg">
      <span className="bg-[hsl(31,43%,49%)] w-9 h-9 rounded-full flex items-center justify-center font-bold text-white">
        {number}
      </span>
      <h2 className="text-xl font-medium">{title}</h2>
    </div>
  );
};
