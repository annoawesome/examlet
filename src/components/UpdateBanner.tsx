interface UpdateBannerProps {
  onReload: () => void;
  onDismiss: () => void;
}

/** Offers a downloaded new version. Nothing changes until the user reloads. */
export function UpdateBanner({ onReload, onDismiss }: UpdateBannerProps) {
  return (
    <div className="update-banner" role="status">
      <span>A new version of Examlet is ready.</span>
      <div className="update-banner-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
          Later
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onReload}>
          Reload
        </button>
      </div>
    </div>
  );
}
