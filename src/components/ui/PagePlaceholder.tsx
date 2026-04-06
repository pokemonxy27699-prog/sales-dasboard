type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl text-white">{title}</h2>
      <p className="text-slate-300 mt-2">{description}</p>
    </div>
  );
}
