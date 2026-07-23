import { HiArrowDownTray, HiArrowPath, HiClock, HiExclamationTriangle } from "react-icons/hi2";

type RequestErrorPageProps = {
  variant?: "timeout" | "error" | "update";
  onRetry?: () => void;
};

const COPY = {
  timeout: {
    title: "Taking longer than expected",
    description:
      "The server didn't respond in time. This is usually temporary — please check your connection and try again.",
    icon: HiClock,
    retryLabel: "Try again",
  },
  error: {
    title: "Something went wrong",
    description: "We couldn't load this page right now. Please try again in a moment.",
    icon: HiExclamationTriangle,
    retryLabel: "Try again",
  },
  update: {
    title: "A new version is available",
    description: "This page was updated since you opened it. Please refresh to get the latest version.",
    icon: HiArrowDownTray,
    retryLabel: "Refresh",
  },
} as const;

export const RequestErrorPage = ({ variant = "error", onRetry }: RequestErrorPageProps) => {
  const copy = COPY[variant];
  const Icon = copy.icon;
  const handleRetry = onRetry ?? (() => window.location.reload());

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <img src="/zidnee-typography.png" alt="Zidnee" className="mb-10 h-8 w-auto sm:h-10" />
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <Icon className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-gray-900">{copy.title}</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{copy.description}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <HiArrowPath className="h-4 w-4" />
        {copy.retryLabel}
      </button>
    </div>
  );
};
