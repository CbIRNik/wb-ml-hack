"use client";

import { motion } from "framer-motion";
import {
  FileLoaderControllerProvider,
  revealTransition,
} from "@/features/file-loader/model";
import { cn } from "@/shared/lib/utils";
import { WorkflowSection } from "./components/workflow-section";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function FileLoader({ className, children, ...props }: Props) {
  return (
    <FileLoaderControllerProvider>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={revealTransition}
        className={cn("flex flex-col gap-6 py-2 md:py-4", className)}
        {...props}
      >
        <WorkflowSection />
        {children}
      </motion.section>
    </FileLoaderControllerProvider>
  );
}
