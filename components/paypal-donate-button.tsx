"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    PayPal?: {
      Donation?: {
        Button: (options: {
          env?: "production" | "sandbox";
          hosted_button_id?: string;
          business?: string;
          image: {
            src: string;
            title: string;
            alt: string;
          };
          onComplete?: (params: Record<string, string>) => void;
        }) => {
          render: (selector: string) => void;
        };
      };
    };
  }
}

interface PaypalDonateButtonProps {
  business?: string;
  className?: string;
  fallbackLabel: string;
  fallbackUrl: string;
  hostedButtonId?: string;
}

export function PaypalDonateButton({
  business,
  className,
  fallbackLabel,
  fallbackUrl,
  hostedButtonId
}: PaypalDonateButtonProps) {
  const rawId = useId();
  const containerId = `paypal-donate-${rawId.replace(/[:]/g, "")}`;
  const [sdkReady, setSdkReady] = useState(false);
  const [renderError, setRenderError] = useState(false);

  const canUseSdk = Boolean(hostedButtonId || business);

  useEffect(() => {
    if (!canUseSdk) {
      return;
    }

    const existing = document.getElementById("paypal-donate-sdk") as HTMLScriptElement | null;
    const handleLoad = () => setSdkReady(true);
    const handleError = () => setRenderError(true);

    if (existing) {
      if (existing.dataset.loaded === "true") {
        queueMicrotask(() => setSdkReady(true));
      } else {
        existing.addEventListener("load", handleLoad);
        existing.addEventListener("error", handleError);
      }

      return () => {
        existing.removeEventListener("load", handleLoad);
        existing.removeEventListener("error", handleError);
      };
    }

    const script = document.createElement("script");
    script.id = "paypal-donate-sdk";
    script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    script.charset = "UTF-8";
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      setSdkReady(true);
    });
    script.addEventListener("error", handleError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("error", handleError);
    };
  }, [canUseSdk]);

  useEffect(() => {
    if (!canUseSdk || !sdkReady || renderError || !window.PayPal?.Donation) {
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    container.innerHTML = "";

    try {
      window.PayPal.Donation.Button({
        env: "production",
        ...(hostedButtonId ? { hosted_button_id: hostedButtonId } : {}),
        ...(!hostedButtonId && business ? { business } : {}),
        image: {
          src: "https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif",
          title: "PayPal - Donate",
          alt: "Donate with PayPal button"
        }
      }).render(`#${containerId}`);
    } catch {
      queueMicrotask(() => setRenderError(true));
    }
  }, [business, canUseSdk, containerId, hostedButtonId, renderError, sdkReady]);

  if (!canUseSdk || renderError) {
    return (
      <a className={className} href={fallbackUrl} rel="noreferrer" target="_blank">
        {fallbackLabel}
      </a>
    );
  }

  return <div className={className} id={containerId} />;
}
