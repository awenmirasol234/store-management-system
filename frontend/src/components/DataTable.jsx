export function DataTable(props) {
  let headClass = "bg-[#EEEEED] border-b border-[#E9E9E9] text-xs font-semibold text-[#151515]";
  if (props.stickyHead) {
    headClass = "sticky top-0 " + headClass;
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead className={headClass}>{props.headRow}</thead>
      <tbody className="divide-y divide-[#E9E9E9]">{props.children}</tbody>
    </table>
  );
}
