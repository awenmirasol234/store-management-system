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
      <div className="flex h-full w-full items-center justify-center bg-white text-base font-semibold text-[#777777] select-none">
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

  let bgClass = "bg-[#EEEEED]";
  if (props.bg === "white" || props.bgWhite) {
    if (props.border === false || props.noBorder) {
      bgClass = "bg-white";
    } else {
      bgClass = "bg-white border border-[#E9E9E9]";
    }
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  if (imageSrc && !hasError) {
    return (
      <div
        className={
          "overflow-hidden rounded-xl " +
          bgClass +
          " flex items-center justify-center " +
          sizeClass +
          extraClass
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
        "rounded-xl " +
        bgClass +
        " flex items-center justify-center text-[#777777] font-semibold text-sm select-none " +
        sizeClass +
        extraClass
      }
    >
      {getInitials(props.name)}
    </div>
  );
}
