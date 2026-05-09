import { Fragment, useMemo } from "react";
import { Link, useLocation } from "react-router";

import { breadcrumbSegmentsFromPath } from "./lib/breadcrumb-from-path";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/kit/breadcrumb";
import { Separator } from "@/shared/ui/kit/separator";
import { SidebarTrigger } from "@/shared/ui/kit/sidebar";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function AppContentHeader() {
  const location = useLocation();
  const segments = useMemo(
    () => breadcrumbSegmentsFromPath(location.pathname),
    [location.pathname]
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;

              return (
                <Fragment key={`${segment.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {isLast || !segment.to ? (
                      <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={segment.to}>{segment.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center px-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
