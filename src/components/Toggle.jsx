import React from 'react';

/**
 * Toggle Switch Component
 * @param {boolean} checked - Toggle state
 * @param {function} onChange - Change handler
 * @param {boolean} recommended - Show star indicator for recommended settings
 */
function Toggle({ checked, onChange, recommended = false, disabled = false }) {
    return (
        <label className={`toggle ${recommended ? 'toggle--recommended' : ''}`}>
            <input
                type="checkbox"
                className="toggle__input"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <span className="toggle__slider"></span>
        </label>
    );
}

export default Toggle;
