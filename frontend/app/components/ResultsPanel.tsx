import { ChevronDownIcon, Clock, RotateCcw } from "lucide-react";
import BandGauge from "./BandGauge";
import { useLanguageContext } from "../contexts/LangaugeContext";
import { ScoringResponse } from "../types";
import ReactMarkdown from "react-markdown";
import CriterionCard from "@/app/components/CriterionCard";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import ErrorHighlightedEssay from "./ErrorHighlightedEssay";

const ResultsPanel = ({
  result,
  submittedEssay,
  handleReset,
}: {
  result: ScoringResponse;
  submittedEssay: string;
  handleReset: () => void;
}) => {
  const { language, setLanguage, t } = useLanguageContext();

  return (
    <div className="bg-background rounded-xl border-2 border-border p-5 space-y-5">
      {/* Overall band */}
      <div className="flex items-start gap-6 flex-wrap">
        <BandGauge
          score={result.overall_band}
          size={130}
          label={t.overall}
          language={language}
        />
        <div className="flex-1 min-w-50 space-y-3 pt-2">
          <div className="text-sm text-text leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{result.overall_feedback}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-text/60">
              <Clock size={11} />
              <span>
                {t.latency} {(result.latency_ms / 1000).toFixed(1)}s
              </span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center bg-primary/30 gap-1.5 text-xs text-text/90 hover:text-text border-2 border-border hover:border-border hover:bg-primary rounded-lg px-3 py-1.5 transition-colors"
            >
              <RotateCcw size={11} />
              {t.newEssay}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-foreground" />

      <div className="mx-auto w-full min-h-0 overflow-visible divide-y divide-foreground rounded-xl bg-primary/5">
        <Disclosure as="div" className="p-6" defaultOpen>
          <DisclosureButton className="group flex w-full items-center justify-between">
            <span className="text-md font-medium text-text group-data-hover:text-text/80">
              {t.ccard}
            </span>
            <ChevronDownIcon className="size-5 fill-text group-data-hover:fill-text group-data-open:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel
            transition
            className="mt-2 text-sm/5 text-text origin-top transition duration-200 ease-out data-closed:-translate-y-6 data-closed:opacity-0 "
          >
            {/* Criterion cards */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-[max-height,opacity] duration-350 ease-in-out max-h-150 opacity-100 p-3
                                  `}
            >
              <CriterionCard
                title={t.taskAchievement}
                data={result.task_achievement}
                feedbackLabel={t.feedback}
              />
              <CriterionCard
                title={t.coherence}
                data={result.coherence_cohesion}
                feedbackLabel={t.feedback}
              />
              <CriterionCard
                title={t.lexical}
                data={result.lexical_resource}
                feedbackLabel={t.feedback}
              />
              <CriterionCard
                title={t.grammar}
                data={result.grammatical_range_accuracy}
                feedbackLabel={t.feedback}
              />
            </div>
          </DisclosurePanel>
        </Disclosure>
        {/* Error-highlighted essay */}
        {result.text_errors.length > 0 && (
          <Disclosure as="div" className="p-6" defaultOpen>
            <DisclosureButton className="group flex w-full items-center justify-between">
              <span className="text-md font-medium text-text group-data-hover:text-text">
                {t.ehe}
              </span>
              <ChevronDownIcon className="size-5 fill-text group-data-hover:fill-text group-data-open:rotate-180" />
            </DisclosureButton>
            <DisclosurePanel
              transition
              className="mt-2 text-sm/5 text-text origin-top transition duration-200 ease-out data-closed:-translate-y-6 data-closed:opacity-0 "
            >
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text/70 uppercase tracking-widest">
                      {t.ehedescription}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-text/70">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />{" "}
                        {t.grammer}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" />{" "}
                        {t.spelling}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-stone-400" />{" "}
                        {t.repetition}
                      </span>
                    </div>
                  </div>
                  <div className="bg-background border border-foreground rounded-lg p-4 text-sm text-text/90">
                    <ErrorHighlightedEssay
                      essay={submittedEssay}
                      errors={result.text_errors}
                    />
                  </div>
                </div>
                <div className="border-t border-foreground" />
              </>
            </DisclosurePanel>
          </Disclosure>
        )}
      </div>
    </div>
  );
};

export default ResultsPanel;
