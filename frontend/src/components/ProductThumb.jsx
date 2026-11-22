import { useState } from "react";
import { resolveImageUrl } from "../api.js";

function getInitials(productName) {
  if (!productName) {
    return "P";
  }
  return productName.trim().slice(0, 2).toUpperCase();
}

export function ProductThumb(props) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = resolveImageUrl(props.imageUrl);

  if (props.fullBleed) {
    if (imageSrc && !hasError) {
      return (
        <img
          src={imageSrc}
          alt={props.name}
          loading="lazy"
          onError={function handleError() {
            setHasError(true);
          }}
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#EEEEED] text-base font-semibold text-[#777777] select-none">
        {getInitials(props.name)}
      </div>
    );
  }

  let sizeClass = "h-28 w-full";
  if (props.size === "sm") {
    sizeClass = "h-11 w-11 shrink-0";
  } else if (props.size === "md") {
    sizeClass = "h-14 w-14 shrink-0";
  }

  if (imageSrc && !hasError) {
    return (
      <div
        className={
          "overflow-hidden rounded-xl bg-[#EEEEED] flex items-center justify-center " + sizeClass
        }
      >
        <img
          src={imageSrc}
          alt={props.name}
          loading="lazy"
          onError={function handleError() {
            setHasError(true);
          }}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={
        "rounded-xl bg-[#EEEEED] flex items-center justify-center text-[#777777] font-semibold text-sm select-none " +
        sizeClass
      }
    >
      {getInitials(props.name)}
    </div>
  );
}
