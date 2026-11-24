export function PageHeader(props) {
  let stackOnMobile = true;
  if (props.stackOnMobile === false) {
    stackOnMobile = false;
  }

  let containerClass =
    "mb-3 flex flex-col justify-between gap-3 sm:mb-4 sm:flex-row sm:items-center sm:gap-4";
  if (!stackOnMobile) {
    containerClass =
      "mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4 sm:gap-4";
  }
  if (props.className) {
    containerClass = containerClass + " " + props.className;
  }

  let subtitleElement = null;
  if (props.subtitle) {
    subtitleElement = (
      <p className="mt-0.5 text-xs text-[#777777]">{props.subtitle}</p>
    );
  }

  let badgeElement = null;
  if (props.badge) {
    badgeElement = <div className="shrink-0">{props.badge}</div>;
  }

  let actionsElement = null;
  if (props.actions) {
    actionsElement = (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
        {props.actions}
      </div>
    );
  } else if (props.children) {
    actionsElement = props.children;
  }

  return (
    <div className={containerClass}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-[#171717]">{props.title}</h1>
          {badgeElement}
        </div>
        {subtitleElement}
      </div>
      {actionsElement}
    </div>
  );
}
