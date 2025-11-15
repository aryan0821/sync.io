import { useState, useEffect } from "react";
import { Circle, Github } from "lucide-react";

export default function IssueTransitionAnimation() {
  const [showLinear, setShowLinear] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLinear((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-80 h-64 flex items-center justify-center">
      {/* Linear Issue Card */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${showLinear
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75 pointer-events-none"
          }`}
      >
        <div className="w-full max-w-sm p-6 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-blue-500">
              <Circle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">
                  LIN-{Math.floor(Math.random() * 1000)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                  In Progress
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">
                Fix authentication bug
              </h3>
              <p className="text-sm text-gray-600">
                Users unable to login with OAuth
              </p>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                  JS
                </div>
                <span className="text-xs text-gray-500">
                  Assigned to John Smith
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Issue Card */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${!showLinear
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75 pointer-events-none"
          }`}
      >
        <div className="w-full max-w-sm p-6 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-gray-900">
              <Github className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">
                  #{Math.floor(Math.random() * 500)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                  Open
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">
                Fix authentication bug
              </h3>
              <p className="text-sm text-gray-600">
                Users unable to login with OAuth
              </p>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                  JS
                </div>
                <span className="text-xs text-gray-500">
                  Opened by johnsmith
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}