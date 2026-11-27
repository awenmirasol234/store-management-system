export function Skeleton(props) {
  let className = "animate-pulse motion-reduce:animate-none rounded bg-[#EEEEED]";
  if (props.className) {
    className = className + " " + props.className;
  }

  return <div aria-hidden="true" className={className} />;
}
