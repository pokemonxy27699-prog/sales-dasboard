type UploadPanelProps = {
  title: string;
  subtitle: string;
  accept?: string;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => Promise<void> | void;
};

export function UploadPanel({
  title,
  subtitle,
  accept,
  disabled,
  onFilesSelected,
}: UploadPanelProps) {
  return (
    <label className="block rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      <input
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="mt-4 block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-100"
        onChange={async (event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          if (nextFiles.length === 0) return;
          await onFilesSelected(nextFiles);
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}
