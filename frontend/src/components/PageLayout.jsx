export function PageLayout(props) {
  let overflowClass = "overflow-hidden";
  if (props.scroll) {
    overflowClass = "overflow-y-auto";
  }

  return (
    <div
      className={
        "flex h-full flex-1 flex-col " +
        overflowClass +
        " bg-slate-50 p-4 sm:p-6 lg:p-7"
      }
    >
      {props.children}
    </div>
  );
}
