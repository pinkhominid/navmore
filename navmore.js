/**
 * @license
 * NavMore <https://github.com/pinkhominid/navmore>
 * A navigation list decorator that produces a responsive horizontal nav menu.
 * Written with ES5 and CSS3. No dependencies.
 *
 * Copyright pinkhominid
 * Released under MIT License <https://raw.githubusercontent.com/pinkhominid/navmore/master/LICENSE>
 *
 * Chrome/Firefox/Safari/Opera/Edge/IE11
 *
 * TODO
 * fix msie
 * support keyboard navigation
 * support varied nav item tags
 * improve animation
 * calc'ed height of droplist
 * a way to denote items outside of viewport in sub-lists (e.g. gradients)
 */

;(function(window) {
  var document = window.document;

  window.navmore = function(nav) {
    var mainList = nav.querySelector('ul');
    var moreItem = createElementFromString('<li class="hidden"><a class="navmore-moreitem" href="javascript:void(0)">More&hellip;</a><ul></ul></li>');
    var moreList = moreItem.querySelector('ul');
    var navItemTagNames = 'A, H1'; // NOTE: css currently supports A, H1
    var selected;
    var unthrottleResize;

    function init() {
      mainList.appendChild(moreItem);
      nav.classList.add('navmore');

      // Public API
      nav.navmore = {
        reset: reorgNav, // recalc/rerender nav items
        collapse: collapse, // collapse dropped menus
        getSelected: getSelected, // get selected hierarchy as array [leaf, ..., root]
        setSelected: setSelected, // set selected leaf item then update hierarchy
        setMoreItemText: setMoreItemText, // update the text for the more item
        destroy: destroy // cleanup all traces of navmore
      };

      // listeners
      unthrottleResize = throttle('resize', 'optimizedResize');
      window.addEventListener('optimizedResize', reorgNav, false);
      window.addEventListener('click', handleTap, false);

      /* bootstrap */
      reorgNav();
    }

    /* BEHAVIORS */

    function isFlex() {
      return nav.classList.contains('navmore-flex') || nav.classList.contains('navmore-flexgrow');
    }

    function isNavLeafItem(target) {
      // has href and not javascript:void(0)
      return target.href && target.href.indexOf('http') === 0;
    }

    function handleTap(e) {
      // retarget tap to account for nested elements
      var target = retargetBubbleEventByTagName(e, mainList, navItemTagNames);
      if (!target) {
        collapse();
        return;
      }

      var isLeaf = isNavLeafItem(target);

      // toggle tapped navItem focus
      if (!isLeaf && isItemFocused(target)) {
        // clear focus for tapped navItem and all descendants
        forEachDescendantsByTagName(target.parentNode, navItemTagNames, blurItem);
        return;
      }

      collapse();

      if (isLeaf) {
        setSelected(target);
      } else { // is branch
        // focus ancestor navItems
        forEachAncestorSiblingsByTagName(target, mainList, 'UL', navItemTagNames, focusItem);
        // focus tapped navItem
        focusItem(target);
      }
    }

    function getLastMainItem() {
      var lastMainItem = moreList.parentElement.previousElementSibling;
      return lastMainItem ? lastMainItem.firstElementChild : null;
    }

    function getFirstMoreItem() {
      var firstMoreItem = moreList.firstElementChild;
      return firstMoreItem ? firstMoreItem.firstElementChild : null;
    }

    function reorgNav() {
      var lastMainItem = getLastMainItem(),
        firstMoreItem = getFirstMoreItem();

      // move items from moreList to mainList
      while (firstMoreItem && (!lastMainItem || !isOverflowing(lastMainItem))) {
        mainList.insertBefore(firstMoreItem.parentElement, moreItem);

        lastMainItem = firstMoreItem;
        firstMoreItem = getFirstMoreItem();
      }
      // move items from mainList to moreList
      while (lastMainItem && isOverflowing(lastMainItem)) {
        moreList.insertBefore(lastMainItem.parentElement, moreList.firstElementChild);

        lastMainItem = getLastMainItem();
        // update while adding to moreList in the case More item itself overflows the list
        updateMoreItemHidden();
      }
      // updates
      updateMoreItemHidden();
      if (moreList.childElementCount > 0 && selected) {
        // refresh selected
        setSelected(selected);
      }
    }

    function updateMoreItemHidden() {
        moreItem.classList[moreList.childElementCount === 0 ? 'add' : 'remove']('hidden');
    }

    function isOverflowing(lastMainItem) {
      if (isFlex()) {
        return getAutoClientWidth(lastMainItem) > lastMainItem.clientWidth;
      } else {
        return mainList.scrollWidth > mainList.clientWidth;
      }
    }

    function collapse() {
      // clear focus for all navItems
      forEachDescendantsByTagName(mainList, navItemTagNames, blurItem);
    }

    function setSelected(item) {
      // clear selected for all navItems
      forEachDescendantsByTagName(mainList, navItemTagNames, deselectItem);

      if (!item) {
        selected = null;
      } else if (item && hasTagName(item, navItemTagNames) && isNavLeafItem(item)) {
        // store selected
        selected = item;
        // mark navItem as selected
        selectItem(item);
        // mark ancestor navItems as selected
        forEachAncestorSiblingsByTagName(item, mainList, 'UL', navItemTagNames, selectItem);
      }

      return nav;
    }

    /* returns array of selected items ordered from leaf (bottom) to root (top) */
    function getSelected() {
      return Array.prototype.slice.call(mainList.querySelectorAll('.selected')).reverse();
    }

    function setMoreItemText(text) {
      moreItem.firstChild.textContent = text;
      reorgNav();
    }

    function destroy() {
      mainList.removeChild(moreItem);
      nav.classList.remove('navmore');

      delete nav.navmore;

      unthrottleResize();
      window.removeEventListener('optimizedResize', reorgNav, false);
      window.removeEventListener('click', handleTap, false);
    }

    /* BOOTSTRAP */
    init();

    return nav;
  };

  /* UTILS */

  // from MDN with modifications
  // https://developer.mozilla.org/en-US/docs/Web/Events/resize
  function throttle(type, name, obj) {
    obj = obj || window;
    var running = false;
    var func = function() {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function() {
        triggerEvent(name, obj);
        running = false;
      });
    };
    var removeFunc = function() {
      obj.removeEventListener(type, func);
    };
    obj.addEventListener(type, func, false);
    return removeFunc;
  }

  // MDN
  function triggerEvent(name, obj) {
    var evt;
    try { evt = new CustomEvent(name); }
    catch(e) {
      evt = document.createEvent('Event');
      evt.initEvent(name, true, true);
    }
    obj.dispatchEvent(evt);
  }

  function createElementFromString(s) {
    var div = document.createElement('div');
    div.innerHTML = s;
    return div.firstChild;
  }

  function getAutoClientWidth(el) {
    var text = el.textContent.trim(),
      style = window.getComputedStyle(el),
      /* get font values separately for firefox :( */
      font = [
        style.getPropertyValue('font-weight'),
        style.getPropertyValue('font-size'),
        style.getPropertyValue('font-family')
      ],
      padLeft = parseInt(style.getPropertyValue('padding-left')),
      padRight = parseInt(style.getPropertyValue('padding-right'));

    return Math.round(getTextWidth(text, font.join(' ')) + padLeft + padRight);
  }

  // http://stackoverflow.com/a/21015393
  function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    var context = canvas.getContext('2d');
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
  }

  function hasTagName(node, tagNames) {
    // tagNames is comma delimited
    return tagNames.split(/\s*,\s*/).indexOf(node.tagName) > -1;
  }

  function retargetBubbleEventByTagName(evt, stopNode, tagNames) {
    var target = evt.target;
    if (!target.nodeType || !stopNode.contains(target)) return null;
    if (!hasTagName(target, tagNames)) {
      return getClosestAncestorByTagName(target, stopNode, tagNames);
    }
    return target;
  }

  function getClosestAncestorByTagName(startNode, stopNode, tagNames) {
    while (startNode) {
      startNode = startNode.parentNode;
      if (!stopNode.contains(startNode) || startNode === stopNode) {
        break;
      }
      if (hasTagName(startNode, tagNames)) {
        return startNode;
      }
    }
    return null;
  }

  function forEachDescendantsByTagName(startNode, tagNames, fn) {
    var descendants = startNode.querySelectorAll(tagNames), i;
    for (i = 0; i < descendants.length; i++) {
      fn(descendants[i]);
    }
  }

  function forEachAncestorSiblingsByTagName(startNode, stopNode, ancestorTags, focusTags, fn) {
    var ancestor, i, node;
    do {
      ancestor = getClosestAncestorByTagName(startNode, stopNode, ancestorTags);
      if (ancestor) {
        for (i = 0; i < ancestor.parentNode.children.length; i++) {
          node = ancestor.parentNode.children[i];
          if (hasTagName(node, focusTags)) {
            fn(node);
          }
        }
      }
      startNode = ancestor;
    } while (startNode);
  }

  function focusItem(item) {
    item.classList.add('focused');
  }

  function isItemFocused(item) {
    return item.classList.contains('focused');
  }

  function blurItem(item) {
    item.classList.remove('focused');
  }

  function selectItem(item) {
    item.classList.add('selected');
  }

  function deselectItem(item) {
    item.classList.remove('selected');
  }

})(window);
