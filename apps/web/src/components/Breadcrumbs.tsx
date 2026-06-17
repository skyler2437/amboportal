"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LABEL_MAP: Record<string, string> = {
  admin: "Admin",
  student: "Student",
  events: "Events",
  posts: "Posts",
  chat: "Chat",
  submissions: "Submissions",
  applications: "Applications",
  applicants: "Applicants",
  users: "Users",
  team: "Team",
  resources: "Resources",
  profile: "Profile",
  new: "New",
  builder: "Builder",
  forms: "Forms",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    // Use UUID detection to show "Detail" for dynamic segments
    const isUuid = /^[0-9a-f-]{36}$/.test(segment);
    const label = isUuid ? "Detail" : LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return { href, label, isLast };
  });

  // Skip the root role segment (admin/student) in display
  const displayCrumbs = crumbs.slice(1);

  if (displayCrumbs.length === 0) return null;

  return (
    <nav className={cn("flex items-center gap-1 text-sm text-muted-foreground mb-4", className)}>
      {displayCrumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
