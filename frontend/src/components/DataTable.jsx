export function DataTable(props) {
  let headClass = "bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600";
  if (props.stickyHead) {
    headClass = "sticky top-0 " + headClass;
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead className={headClass}>{props.headRow}</thead>
      <tbody className="divide-y divide-slate-100">{props.children}</tbody>
    </table>
  );
}
