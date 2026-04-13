export const SectionCard = ({ children, className = '' }) => (
  <div
    className={`rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-6 ${className}`}
  >
    {children}
  </div>
);

export const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1">
    {children}
  </label>
);

export const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
  </svg>
);

export const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
  </svg>
);
