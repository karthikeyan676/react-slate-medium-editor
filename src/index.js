import React from "react";
import styled from "styled-components";
import { Block } from "slate";
import { Editor, getEventRange, getEventTransfer } from "slate-react";
import isUrl from "is-url";
import imageExtensions from "./image-extensions";

import HoverMenu from "./components/hover-menu";
import SideMenu from "./components/side-menu";

/**
 * A styled image block component.
 *
 * @type {Component}
 */

const Image = styled.img`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? "0 0 0 2px blue;" : "none")};
`;

/*
 * A function to determine whether a URL has an image extension.
 *
 * @param {String} url
 * @return {Boolean}
 */

function isImage(url) {
  console.log(url);
  return !!imageExtensions.find(url.endsWith);
}

/**
 * A change function to standardize inserting images.
 *
 * @param {Editor} editor
 * @param {String} src
 * @param {Range} target
 */

function insertImage(editor, src, target) {
  if (target) {
    editor.select(target);
  }

  editor.insertBlock({
    type: "image",
    data: { src }
  });
}

/**
 * The editor's schema.
 *
 * @type {Object}
 */

const schema = {
  document: {
    last: { type: "paragraph" },
    normalize: (editor, { code, node, child }) => {
      switch (code) {
        case "last_child_type_invalid": {
          const paragraph = Block.create("paragraph");
          return editor.insertNodeByKey(node.key, node.nodes.size, paragraph);
        }
      }
    }
  },
  blocks: {
    image: {
      isVoid: true
    }
  }
};

/**
 * The hovering menu example.
 *
 * @type {Component}
 */

class HoveringMenu extends React.Component {
  /**
   * On update, update the menu.
   */

  componentDidMount = () => {
    this.updateMenu();
    this.updateSideMenu();
  };

  componentDidUpdate = () => {
    this.updateMenu();
    this.updateSideMenu();
  };

  /**
   * Update the menu's absolute position.
   */

  updateSideMenu = () => {
    const sideMenu = this.sideMenu;
    if (!sideMenu) return;

    const { value } = this.props;
    const { selection, texts } = value;

    if (selection.isBlurred || !selection.isCollapsed) {
      sideMenu.removeAttribute("style");
      return;
    }

    const native = window.getSelection();

    if (native.rangeCount === 0) {
      sideMenu.removeAttribute("style");
      return;
    }

    if (texts && texts.get(0) && texts.get(0).text.length !== 0) {
      sideMenu.removeAttribute("style");
      return;
    }

    const range = native.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    sideMenu.style.opacity = 1;

    const top = rect.top + window.pageYOffset - 10;
    sideMenu.style.top = `${top}px`;

    const left = rect.left - sideMenu.offsetWidth;
    sideMenu.style.left = `${left}px`;
  };

  /**
   * Update the menu's absolute position.
   */

  updateMenu = () => {
    const menu = this.menu;
    if (!menu) return;

    const { value } = this.props;
    const { fragment, selection } = value;

    if (selection.isBlurred || selection.isCollapsed || fragment.text === "") {
      menu.removeAttribute("style");
      return;
    }

    const native = window.getSelection();
    const range = native.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    menu.style.opacity = 1;

    const top = rect.top + window.pageYOffset - menu.offsetHeight;
    menu.style.top = `${top < 0 ? 0 : top}px`;

    const left =
      rect.left + window.pageXOffset - menu.offsetWidth / 2 + rect.width / 2;

    menu.style.left = `${left < 0 ? 0 : left}px`;
  };

  /**
   * Render.
   *
   * @return {Element}
   */

  render() {
    const { value } = this.props;

    return (
      <div>
        <Editor
          placeholder="Enter some text..."
          value={value}
          onChange={this.onChange}
          renderEditor={this.renderEditor}
          renderMark={this.renderMark}
          schema={schema}
          onDrop={this.onDropOrPaste}
          onPaste={this.onDropOrPaste}
          renderNode={this.renderNode}
        />
      </div>
    );
  }

  /**
   * Render the editor.
   *
   * @param {Object} props
   * @param {Function} next
   * @return {Element}
   */

  renderEditor = (props, editor, next) => {
    const children = next();
    return (
      <React.Fragment>
        {children}
        <HoverMenu innerRef={menu => (this.menu = menu)} editor={editor} />
        <SideMenu
          innerRef={sideMenu => (this.sideMenu = sideMenu)}
          editor={editor}
        />
      </React.Fragment>
    );
  };

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @param {Editor} editor
   * @param {Function} next
   * @return {Element}
   */

  renderMark = (props, editor, next) => {
    const { children, mark, attributes } = props;

    switch (mark.type) {
      case "bold":
        return <strong {...attributes}>{children}</strong>;
      case "code":
        return <code {...attributes}>{children}</code>;
      case "italic":
        return <em {...attributes}>{children}</em>;
      case "underlined":
        return <u {...attributes}>{children}</u>;
      default:
        return next();
    }
  };

  /**
   * Render a Slate node.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderNode = (props, editor, next) => {
    const { attributes, node, isFocused } = props;

    switch (node.type) {
      case "image": {
        const src = node.data.get("src");
        return <Image src={src} selected={isFocused} {...attributes} />;
      }

      default: {
        return next();
      }
    }
  };

  /**
   * On drop, insert the image wherever it is dropped.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  onDropOrPaste = (event, editor, next) => {
    const target = getEventRange(event, editor);
    if (!target && event.type === "drop") return next();

    const transfer = getEventTransfer(event);
    const { type, text, files } = transfer;

    if (type === "files") {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split("/");
        if (mime !== "image") continue;

        reader.addEventListener("load", () => {
          editor.command(insertImage, reader.result, target);
        });

        reader.readAsDataURL(file);
      }
      return;
    }

    if (type === "text") {
      if (!isUrl(text)) return next();
      if (!isImage(text)) return next();
      editor.command(insertImage, text, target);
      return;
    }

    next();
  };

  /**
   * On change.
   *
   * @param {Editor} editor
   */

  onChange = ({ value }) => {
    const { onChange } = this.props;
    onChange(value);
  };
}

/**
 * Export.
 */

export default HoveringMenu;