"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import NumberFlow from "@number-flow/react";
import { FileText, CheckCheck, Scale, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Single Letter",
    description:
      "Perfect for one-time legal needs. Get a professional letter without commitment.",
    price: 299,
    yearlyPrice: 299,
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    features: [
      { text: "1 Professional Legal Letter", icon: <FileText size={20} /> },
      { text: "Attorney Review Included", icon: <Scale size={20} /> },
      { text: "PDF Download", icon: <CheckCheck size={20} /> },
    ],
    includes: [
      "Includes:",
      "AI-powered draft",
      "Professional formatting",
      "Email delivery",
      "48-hour turnaround",
    ],
  },
  {
    name: "Monthly Plan",
    description:
      "Best value for ongoing legal communication needs with 4 letters per month.",
    price: 299,
    yearlyPrice: 299,
    buttonText: "Get Started",
    buttonVariant: "default" as const,
    popular: true,
    features: [
      { text: "4 Letters Per Month", icon: <FileText size={20} /> },
      { text: "Attorney Review", icon: <Scale size={20} /> },
      { text: "Priority Support", icon: <Zap size={20} /> },
    ],
    includes: [
      "Everything in Single Letter, plus:",
      "Cancel anytime",
      "Roll over unused letters",
      "Priority queue",
      "24-hour turnaround",
    ],
  },
  {
    name: "Annual Plan",
    description:
      "Maximum value with 8 letters per year. Save 50% compared to monthly.",
    price: 599,
    yearlyPrice: 599,
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    features: [
      { text: "8 Letters Per Year", icon: <FileText size={20} /> },
      { text: "Attorney Review", icon: <Scale size={20} /> },
      { text: "Premium Support", icon: <Zap size={20} /> },
    ],
    includes: [
      "Everything in Monthly, plus:",
      "50% cost savings",
      "Custom templates",
      "Dedicated support",
      "12-hour turnaround",
    ],
  },
];

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-50 mx-auto flex w-fit rounded-full bg-neutral-50 border border-gray-200 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={`relative z-10 w-fit sm:h-12 h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors ${
            selected === "0"
              ? "text-white"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">One-Time</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={`relative z-10 w-fit sm:h-12 h-8 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors ${
            selected === "1"
              ? "text-white"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Subscription
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-black">
              Best Value
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const [isSubscription, setIsSubscription] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsSubscription(Number.parseInt(value) === 1);

  return (
    <div className="px-4 py-20 mx-auto relative bg-gradient-to-br from-white via-cyan-50 to-teal-50" ref={pricingRef}>
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0"
        style={{
          backgroundImage: `
        radial-gradient(circle at center, #206ce8 0%, transparent 70%)
      `,
          opacity: 0.3,
          mixBlendMode: "multiply",
        }}
      />

      <div className="text-center mb-6 max-w-3xl mx-auto relative z-10">
        <TimelineContent
          as="h2"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="md:text-6xl sm:text-4xl text-3xl font-medium text-gray-900 mb-4"
        >
          Plans that work best for your{" "}
          <TimelineContent
            as="span"
            animationNum={1}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="border border-dashed border-blue-500 px-2 py-1 rounded-xl bg-blue-100 capitalize inline-block"
          >
            legal needs
          </TimelineContent>
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="sm:text-base text-sm text-gray-600 sm:w-[70%] w-[80%] mx-auto"
        >
          Professional legal letters drafted by attorneys, delivered in 24-48 hours. Choose the plan that fits your needs.
        </TimelineContent>
      </div>

      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="relative z-10"
      >
        <PricingSwitch onSwitch={togglePricingPeriod} />
      </TimelineContent>

      <div className="grid md:grid-cols-3 max-w-7xl gap-4 py-6 mx-auto relative z-10">
        {plans.map((plan, index) => (
          <TimelineContent
            key={plan.name}
            as="div"
            animationNum={4 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <Card
              className={`relative border-neutral-200 ${
                plan.popular ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white "
              }`}
            >
              <CardHeader className="text-left">
                <div className="flex justify-between">
                  <h3 className="text-3xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <div className="">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Popular
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-semibold text-gray-900">
                    $
                    <NumberFlow
                      value={plan.price}
                      className="text-4xl font-semibold"
                    />
                  </span>
                  <span className="text-gray-600 ml-1">
                    {plan.name === "Single Letter" ? "/letter" : plan.name === "Monthly Plan" ? "/month" : "/year"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <Link href="/auth/signup">
                  <button
                    className={`w-full mb-6 p-4 text-xl rounded-xl transition-all duration-300 ${
                      plan.popular
                        ? "bg-gradient-to-t from-blue-500 to-blue-600  shadow-lg shadow-blue-500 border border-blue-400 text-white hover:shadow-xl hover:scale-105"
                        : plan.buttonVariant === "outline"
                          ? "bg-gradient-to-t from-neutral-900 to-neutral-600  shadow-lg shadow-neutral-900 border border-neutral-700 text-white hover:shadow-xl hover:scale-105"
                          : ""
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </Link>
                <ul className="space-y-2 font-semibold py-5">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-neutral-800 grid place-content-center mt-0.5 mr-3">
                        {feature.icon}
                      </span>
                      <span className="text-sm text-gray-600">
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 pt-4 border-t border-neutral-200">
                  <h4 className="font-medium text-base text-gray-900 mb-3">
                    {plan.includes[0]}
                  </h4>
                  <ul className="space-y-2 font-semibold">
                    {plan.includes.slice(1).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <span className="h-6 w-6 bg-green-50 border border-blue-500 rounded-full grid place-content-center mt-0.5 mr-3">
                          <CheckCheck className="h-4 w-4 text-blue-500 " />
                        </span>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>
    </div>
  );
}
