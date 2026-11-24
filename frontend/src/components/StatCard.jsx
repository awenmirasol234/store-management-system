export function StatCard(props) {
  const IconComponent = props.icon;
  let iconElement = null;
  if (IconComponent) {
    iconElement = (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEEED] border border-[#E2E1DF] border-b-2 border-b-[#D0CFCB] text-[#151515] shadow-2xs">
        <IconComponent className="h-5 w-5" />
      </div>
    );
  }

  let footerElement = null;
  if (props.meta) {
    footerElement = <div className="mt-1.5 font-mono text-xs text-[#777777]">{props.meta}</div>;
  }

  return (
    <div className="rounded-2xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-xs font-semibold text-[#777777]">
            {props.label}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#151515]">
            {props.value}
          </div>
          {footerElement}
        </div>
        {iconElement}
      </div>
    </div>
  );
}
