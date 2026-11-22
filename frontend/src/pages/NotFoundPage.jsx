import { FileQuestion, LayoutDashboard, ShoppingBag } from "lucide-react";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { PageLayout } from "../components/PageLayout.jsx";

export function NotFoundPage(props) {
  function handleGoHome() {
    if (props.onNavigate) {
      if (props.currentUser && props.currentUser.role === "CASHIER") {
        props.onNavigate("pos");
      } else {
        props.onNavigate("dashboard");
      }
    }
  }

  function handleGoPos() {
    if (props.onNavigate) {
      props.onNavigate("pos");
    }
  }

  let isCashier = false;
  if (props.currentUser && props.currentUser.role === "CASHIER") {
    isCashier = true;
  }

  let requestedPathElement = null;
  if (props.requestedPath && props.requestedPath !== "not-found") {
    let cleanPath = props.requestedPath;
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.slice(1);
    }
    requestedPathElement = (
      <div className="mt-2 text-2xs text-[#777777]">
        Requested path:{" "}
        <span className="rounded-md bg-[#EEEEED] border border-[#E9E9E9] px-1.5 py-0.5 font-mono text-[#151515]">
          {"/" + cleanPath}
        </span>
      </div>
    );
  }

  let primaryButton = null;
  let secondaryButton = null;
  if (isCashier) {
    primaryButton = (
      <Button variant="primary" size="lg" onClick={handleGoHome}>
        <ShoppingBag className="h-4 w-4" />
        <span>Back to POS</span>
      </Button>
    );
  } else {
    primaryButton = (
      <Button variant="primary" size="lg" onClick={handleGoHome}>
        <LayoutDashboard className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Button>
    );

    secondaryButton = (
      <Button variant="secondary" size="lg" onClick={handleGoPos}>
        <ShoppingBag className="h-4 w-4" />
        <span>Open POS</span>
      </Button>
    );
  }

  return (
    <PageLayout scroll={true}>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#E9E9E9] bg-white p-8 text-center shadow-xs sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEEEED] text-[#151515]">
            <FileQuestion className="h-8 w-8" />
          </div>

          <div className="mb-2">
            <Badge tone="amber">404 Error</Badge>
          </div>

          <h1 className="text-xl font-bold text-[#151515] sm:text-2xl">Page Not Found</h1>

          <p className="mt-2 text-xs leading-relaxed text-[#777777] sm:text-sm">
            The page or view you are looking for doesn't exist, may have been moved, or you don't
            have permission to access it.
          </p>

          {requestedPathElement}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {primaryButton}
            {secondaryButton}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
