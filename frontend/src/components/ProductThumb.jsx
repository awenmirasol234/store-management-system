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
  let sizeClass = "h-28 w-full";
  if (props.size === "sm") {
    sizeClass = "h-11 w-11 shrink-0";
  }

  if (imageSrc && !hasError) {
    return (
      <div
        className={
          "overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center " + sizeClass
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
        "rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-semibold text-sm select-none " +
        sizeClass
      }
    >
      {getInitials(props.name)}
    </div>
  );
}
