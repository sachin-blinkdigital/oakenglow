import React from 'react';

const AppModal = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay modal">
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose}>
                    <span>&times;</span>
                </button>
                {children}
            </div>
        </div>
    );
};

export default AppModal;