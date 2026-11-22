function getPaddingClass(padding) {
  if (padding === "sm") {
    return "py-10";
  }
  if (padding === "md") {
    return "py-12";
  }
  if (padding === "lg") {
    return "py-16";
  }
  return "py-14";
}

function getToneClass(tone) {
  if (tone === "faint") {
    return "text-[#777777]/70";
  }
  return "text-[#777777]";
}

export function EmptyState(props) {
  return (
    <div
      className={
        "text-center text-sm " +
        getPaddingClass(props.padding) +
        " " +
        getToneClass(props.tone)
      }
    >
      {props.message}
    </div>
  );
}
