import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { HistoryItem, ScoringResponse } from "../types";
import { getBandColor } from "./BandGauge";
import { useLanguageContext } from "../contexts/LangaugeContext";

const HistorySelector = ({
  result,
  setResult,
  setSubmittedEssay,
  submittedEssay,
}: {
  result: ScoringResponse | null;
  setResult: Dispatch<SetStateAction<ScoringResponse | null>>;
  setSubmittedEssay: Dispatch<SetStateAction<string>>;
  submittedEssay: string;
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const { language, t } = useLanguageContext();

  useEffect(() => {
    const stored = localStorage.getItem("results");
    if (!stored) return;
    setHistoryItems(JSON.parse(stored) || []);
  }, []);

  function handleDelete(index: number) {
    const updated = historyItems.filter((_, idx) => idx !== index);
    localStorage.setItem("results", JSON.stringify(updated));
    setHistoryItems(updated);
  }

  return (
    <Menu>
      <MenuButton className="flex items-center justify-center  gap-2 text-sm md:w-full w-[75vw] text-text hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none">
        {t.history}
        <ChevronDown size={11} />
      </MenuButton>
      <MenuItems
        anchor={{ to: "bottom end", gap: "8px" }}
        transition
        className="p-2 bg-muted border border-border rounded-xl shadow-2xl z-30 md:w-96 w-[75vw] overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0 flex justify-center items-center flex-col"
      >
        {historyItems.length ? (
          historyItems.map((item, i) => (
            <div key={i}>
              {i != 0 && (
                <div className="border-t border border-border rounded-full my-1" />
              )}
              <MenuItem>
                <div
                  className={`w-full flex items-center gap-1 px-3 py-1 my-0.5 text-sm transition-colors rounded-3xl ${
                    item.essay === submittedEssay
                      ? "bg-primary/60 font-semibold"
                      : "hover:text-text hover:bg-primary/60"
                  }`}
                >
                  <button
                    onClick={() => {
                      setResult(item.result);
                      setSubmittedEssay(item.essay);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span
                      className="flex-shrink-0 w-10 py-1 text-[16px] text-center font-semibold bg-muted rounded-full"
                      style={{ color: getBandColor(item.result.overall_band) }}
                    >
                      {item.result.overall_band}
                    </span>
                    <span className="line-clamp-1 text-text flex-1 min-w-0 text-left">
                      {item.essay}
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(i);
                    }}
                    className="flex-shrink-0 p-1.5 text-text bg-muted rounded-full  hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </MenuItem>
            </div>
          ))
        ) : (
          <span
            className={`text-text ${language === "fa" && "font-persian"}`}
            dir={language === "fa" ? "rtl" : "ltr"}
          >
            {t.historyEmpty}
          </span>
        )}
      </MenuItems>
    </Menu>
  );
};

export default HistorySelector;
