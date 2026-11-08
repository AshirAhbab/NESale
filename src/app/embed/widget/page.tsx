"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShopperWidget } from "@/components/widget/ShopperWidget";

function EmbedWidgetContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || undefined;

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-0 m-0 overflow-hidden select-none">
      <ShopperWidget
        businessId={businessId}
        isEmbedFrame={true}
      />
    </div>
  );
}

export default function EmbedWidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-screen bg-[#11141d] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EmbedWidgetContent />
    </Suspense>
  );
}
