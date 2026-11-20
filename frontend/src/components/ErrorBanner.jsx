export function ErrorBanner(props) {
  if (!props.message) {
    return null;
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  return (
    <div
      className={
        "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700" +
        extraClass
      }
    >
      {props.message}
    </div>
  );
}
