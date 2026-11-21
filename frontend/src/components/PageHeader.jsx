export function PageHeader(props) {
  let containerClass =
    "mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4";
  if (props.stackOnMobile) {
    containerClass =
      "mb-5 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4";
  }

  return (
    <div className={containerClass}>
      <h1 className="text-lg font-bold text-slate-900">{props.title}</h1>
      {props.children}
    </div>
  );
}
