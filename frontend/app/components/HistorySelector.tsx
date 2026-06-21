import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { HistoryItem, ScoringResponse } from "../types";

const HistorySelector = ({
  result,
  setResult,
  setSubmittedEssay,
}: {
  result: ScoringResponse | null;
  setResult: Dispatch<SetStateAction<ScoringResponse | null>>;
  setSubmittedEssay: Dispatch<SetStateAction<string>>;
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    const stored = localStorage.getItem("results");
    if (!stored) return;
    console.log(stored);

    setHistoryItems(JSON.parse(stored) || []);
  }, []);

  return (
    <Menu>
      <MenuButton className="flex items-center justify-center  gap-2 text-sm md:w-full w-[75vw] text-text hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none">
        History
        <ChevronDown size={11} />
      </MenuButton>
      <MenuItems
        anchor={{ to: "bottom end", gap: "8px" }}
        transition
        className="p-2 bg-muted border border-border rounded-xl shadow-2xl z-30 md:w-96 w-[75vw] overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0"
      >
        {historyItems.length ? (
          historyItems.map((item, i) => (
            <div key={i}>
              {i != 0 && (
                <div className="border-t border-2 border-border rounded-full my-1" />
              )}
              <MenuItem>
                <button
                  onClick={() => {
                    setResult(item.result);
                    setSubmittedEssay(item.essay);
                    setHistoryItems(
                      JSON.parse(localStorage.getItem("results") || "[]"),
                    );
                  }}
                  className={`w-full text-center px-3 py-2 my-0.5 text-sm transition-colors rounded-2xl ${
                    item.result.task_achievement === result?.task_achievement
                      ? "text-text bg-primary/60 font-semibold"
                      : "text-text/80 hover:text-text hover:bg-primary/60"
                  }`}
                >
                  {item.question}
                </button>
              </MenuItem>
            </div>
          ))
        ) : (
          <span className="text-text text-center mx-auto">
            Nothing to show!
          </span>
        )}
      </MenuItems>
    </Menu>
  );
};

export default HistorySelector;
