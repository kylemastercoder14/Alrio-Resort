"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CheckoutOperator = {
  resortName: string;
  ownerName: string;
  avatar: string;
};

export function OperatorMessagePanel({
  operator,
}: {
  operator: CheckoutOperator;
}) {
  const [message, setMessage] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleNext() {
    setIsCollapsed(true);
    window.setTimeout(() => {
      document
        .getElementById("review-reservation")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-7 shadow-xl shadow-zinc-200/70">
      <input
        form="reservation-booking-form"
        type="hidden"
        name="messageToHost"
        value={message}
      />

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">
          2. Send booking notes to the resort
        </h2>
        {isCollapsed ? (
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl px-6"
            onClick={() => setIsCollapsed(false)}
          >
            Change
          </Button>
        ) : null}
      </div>

      {isCollapsed ? (
        <div className="mt-4 flex items-center gap-4 text-zinc-600">
          <div className="relative size-10 overflow-hidden rounded-full bg-zinc-100">
            <Image
              src={operator.avatar}
              alt={operator.resortName}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <p className="line-clamp-2">
            {message.trim() || "No special booking notes added."}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-5 max-w-2xl text-base leading-6 text-zinc-600">
            Share anything the resort team should know before they prepare your
            reservation, room setup, amenities, and guest services.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative size-14 overflow-hidden rounded-full bg-zinc-100">
              <Image
                src={operator.avatar}
                alt={operator.resortName}
                fill
                sizes="56px"
                className="object-cover"
              />
              <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-sky-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">{operator.ownerName}</p>
              <p className="text-base text-zinc-500">
                {operator.resortName} owner/operator
              </p>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="mt-5 w-full rounded-xl border border-zinc-500 bg-white px-5 py-4 text-base leading-6 outline-none transition placeholder:text-zinc-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
            placeholder={`Example: "Hi ${operator.ownerName}, we are arriving with ${operator.resortName} guests and would like pool access, breakfast, and early check-in if available."`}
          />

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={handleNext}
              className="h-14 rounded-xl bg-sky-600 px-8 text-lg font-semibold hover:bg-sky-700"
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
