export default function StatsBar({ isLive }: { isLive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12 py-4 border-y border-lab-border bg-[#1a1a1a] flex-wrap">
      <div className="flex items-center gap-2 font-mono text-[13px] text-lab-muted">
        <span className="font-semibold text-lab-white">6</span> AI Models
      </div>
      <div className="flex items-center gap-2 font-mono text-[13px] text-lab-muted">
        <span className="font-semibold text-lab-white">63</span> Games
      </div>
      <div className="flex items-center gap-2 font-mono text-[13px] text-lab-muted">
        <span className="font-semibold text-lab-white">1,920</span> Max Points
      </div>
      <div className="flex items-center gap-2 font-mono text-[13px] text-lab-muted">
        {isLive ? (
          <>
            <span className="live-dot" />
            <span>Live</span>
          </>
        ) : (
          <span>Mar 20</span>
        )}
      </div>
    </div>
  );
}
