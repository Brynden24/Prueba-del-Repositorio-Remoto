import React from "react";
import { useContext } from "react";
import { createPortal } from "react-dom";
import { ModalContext } from "../providers/ModalContext";
import * as style from './Modal.module.css'

const {
    modalOverlay,
    modalContainer,
    modalClose
} = style

function Modal() {
  const { isOpen, closeModal, modalContent } = useContext(ModalContext);

  if (!isOpen) return null;

  return createPortal(
    <div className={modalOverlay} onClick={closeModal}>
      <div className={modalContainer} onClick={(e) => e.stopPropagation()}>
        {modalContent}
      </div>
    </div>,
    document.body
  );
};

export {Modal};
