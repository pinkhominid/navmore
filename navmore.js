/**
 * @license
 * NavMore <https://github.com/pinkhominid/navmore>
 * A navigation list decorator that produces a responsive horizontal nav menu.
 * Written with ES5 and CSS3. No dependencies.
 *
 * MIT License <https://raw.githubusercontent.com/pinkhominid/navmore/master/LICENSE>
 *
 * Chrome/Safari/Firefox/IE10+
 *
 * TODO
 * support keyboard navigation
 * test deeper nesting?
 * navmore.destroy fn
 * improve animation
 * fit sub-list dropdown to window
 * auto width sub-lists on wider screens
 * a way to denote items outside of viewport in sub-lists (e.g. gradients)
 */

;(function(window) {
  var document = window.document;

  window.navmore = function (nav) {
    var mainList = nav.querySelector('ul');
    var moreItem = createElementFromString('<li class="hidden"><a class="navmore-more-item" href="javascript:void(0)">More...</a><ul></ul></li>');
    var moreList = moreItem.querySelector('ul');
    var navItemTagNames = 'A, H1'; // NOTE: css currently supports A, H1
    var selected;

    function init() {
      mainList.appendChild(moreItem);
      nav.classList.add('navmore');
      nav.navmore = {
        setSelectedItem: setSelectedItem
      };

      throttle('resize', 'optimizedResize');

      window.addEventListener('optimizedResize', reorgNav);
      window.addEventListener('click', handleTap, false);

      /* bootstrap */
      reorgNav();
    }

    /* BEHAVIORS */

    function isFlex() {
      return nav.classList.contains('flex') || nav.classList.contains('flexgrow');
    }

    function isNavLeafItem(target) {
      // has href and not javascript:void(0)
      return target.href && target.href.startsWith('http');
    }

    function handleTap(e) {
      // retarget tap to account for nested elements
      var target = retargetBubbleEventByTagName(e, mainList, navItemTagNames);
      if (!target) {
        // clear focus for all navItems
        forEachDescendantsByTagName(mainList, navItemTagNames, blurItem);
        return;
      }

      var isLeaf = isNavLeafItem(target);

      // toggle tapped navItem focus
      if (!isLeaf && isItemFocused(target)) {
        // clear focus for tapped navItem and all descendants
        forEachDescendantsByTagName(target.parentNode, navItemTagNames, blurItem);
        return;
      }

      // clear focus for all navItems
      forEachDescendantsByTagName(mainList, navItemTagNames, blurItem);

      if (isLeaf) {
        setSelectedItem(target);
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
      while (firstMoreItem && !isOverflowing(lastMainItem)) {
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
        setSelectedItem(selected);
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

    function setSelectedItem(item) {
      // clear selected for all navItems
      forEachDescendantsByTagName(mainList, navItemTagNames, unselectItem);

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

    /* BOOTSTRAP */
    init();

    return nav;
  };

  /* UTILS */

  // from MDN
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
    obj.addEventListener(type, func);
  }

  // simple debounce
  // http://stackoverflow.com/questions/20695334/is-this-a-simple-debounce-function-in-javascript
  function debounce(fn, delay){
    var timeoutId;
    return function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(fn.bind(this), delay);
    };
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
    var text = el.text,
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

  function blurItem(item) {
    item.classList.remove('focused');
  }

  function focusItem(item) {
    item.classList.add('focused');
  }

  function isItemFocused(item) {
    return item.classList.contains('focused');
  }

  function unselectItem(item) {
    item.classList.remove('selected');
  }

  function selectItem(item) {
    item.classList.add('selected');
  }

})(window);
