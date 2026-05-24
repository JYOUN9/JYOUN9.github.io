$(document).ready(function () {
  var initializePage = function () {
  // typing animation
  (function ($) {
    $.fn.writeText = function (content) {
      var contentArray = content.split(""),
        current = 0,
        elem = this;
      setInterval(function () {
        if (current < contentArray.length) {
          elem.text(elem.text() + contentArray[current++]);
        }
      }, 80);
    };
  })(jQuery);

  // input text for typing animation
  if ($("#holder").length) {
    $("#holder").writeText("WEB DESIGNER + FRONT-END DEVELOPER");
  }

  // initialize wow.js
  new WOW().init();

  // Push the body and the nav over by 285px over
  var main = function () {
    $(".fa-bars").click(function () {
      $(".nav-screen").animate(
        {
          right: "0px"
        },
        200
      );

      $("body").animate(
        {
          right: "285px"
        },
        200
      );
    });

    // Then push them back */
    $(".fa-times").click(function () {
      $(".nav-screen").animate(
        {
          right: "-285px"
        },
        200
      );

      $("body").animate(
        {
          right: "0px"
        },
        200
      );
    });

    $(".nav-links a").click(function () {
      $(".nav-screen").animate(
        {
          right: "-285px"
        },
        500
      );

      $("body").animate(
        {
          right: "0px"
        },
        500
      );
    });
  };

  $(document).ready(main);

  var syncThemeToggle = function () {
    if (window.personalPageTheme) {
      window.personalPageTheme.sync();
    }
  };

  var updateHeaderForScroll = function () {
    var isPageScrolled = $(window).scrollTop() > 0;
    var isDarkMode = $("html").hasClass("theme-dark");
    var headerBackground = "transparent";
    var headerColor = "white";

    if (isPageScrolled) {
      headerBackground = isDarkMode ? "#171a19" : "white";
      headerColor = isDarkMode ? "white" : "black";
    }

    $(".header-links a, .theme-toggle").css("color", headerColor);
    $(".header-links").css("background-color", headerBackground);
  };

  var updateHomeShrink = function () {
    var homeSection = $(".embedded-home");
    var homeFrame = $(".home-embed");

    if (!homeSection.length || !homeFrame.length) {
      updateHeaderForScroll();
      return;
    }

    var viewportWidth = $(window).width();
    var viewportHeight = $(window).height();
    var scrollWithinHome = Math.max(0, $(window).scrollTop() - homeSection.offset().top);
    var mobile = viewportWidth <= 599;
    var targetScale = mobile ? 0.94 : 0.92;
    var shrinkDistance = Math.max(viewportHeight * (1 - targetScale), 1);
    var progress = Math.max(0, Math.min(scrollWithinHome / shrinkDistance, 1));
    var frameTop = Math.min(scrollWithinHome, shrinkDistance);
    var scale = 1 - (1 - targetScale) * progress;
    var isScrolled = progress > 0;

    homeFrame.css({
      top: frameTop + "px",
      width: "100vw",
      height: "100vh",
      "-webkit-transform": "translateX(-50%) scale(" + scale + ")",
      transform: "translateX(-50%) scale(" + scale + ")"
    });
    homeSection.toggleClass("is-scrolled", isScrolled);

    if (window.setHomeMotionPaused) {
      window.setHomeMotionPaused(isScrolled);
    }

    updateHeaderForScroll();
  };

  var scrollToSectionTitle = function (anchor) {
    var section = $('.section[data-anchor="' + anchor + '"]');
    var title = section.find("h1").first();
    var target = title.length ? title : section;

    if (!target.length) {
      return false;
    }

    var headerOffset = $(".header-links").outerHeight() || 0;
    var targetTop = Math.max(0, target.offset().top - headerOffset - 12);

    $("html, body").stop().animate(
      {
        scrollTop: targetTop
      },
      260,
      function () {
        updateHeaderForScroll();
      }
    );

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + anchor);
    }

    return true;
  };

  var scrollToPageTarget = function (hash) {
    var targetElement = document.getElementById(hash.replace(/^#/, ""));
    var target = $(targetElement);

    if (!target.length) {
      return false;
    }

    var workItem = target.hasClass("work-item") ? target : target.closest(".work-item");

    if (workItem.length) {
      var category = workItem.data("work-category");
      var filterButton = $('.work-filter[data-work-filter="' + category + '"]');

      if (filterButton.length) {
        $(".work-filter").removeClass("is-active");
        filterButton.addClass("is-active");
        applyWorkFilter(category);
      }
    }

    var headerOffset = $(".header-links").outerHeight() || 0;
    var targetTop = Math.max(0, target.offset().top - headerOffset - 16);

    $("html, body").stop().animate(
      {
        scrollTop: targetTop
      },
      300,
      function () {
        updateHeaderForScroll();
      }
    );

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", hash);
    }

    return true;
  };

  $(document).on("click", ".header-links a[href^='#'], .nav-links a[href^='#']", function (event) {
    var anchor = (this.getAttribute("href") || "").replace(/^#/, "");

    if (anchor && scrollToSectionTitle(anchor)) {
      event.preventDefault();
    }
  });

  $(document).on("click", ".news-title-link[href^='#'], .news-thumb-link[href^='#']", function (event) {
    var hash = this.getAttribute("href") || "";
    var anchor = hash.replace(/^#/, "");

    if (!anchor) {
      return;
    }

    if (scrollToSectionTitle(anchor) || scrollToPageTarget(hash)) {
      event.preventDefault();
    }
  });

  syncThemeToggle();
  window.addEventListener("personal-page-themechange", updateHeaderForScroll);

  updateHomeShrink();
  $(window).on("scroll resize", updateHomeShrink);

  // initiate full page scroll

  $("#fullpage").fullpage({
    autoScrolling: false,
    scrollBar: true,
    responsiveWidth: 400,
    navigation: true,
    navigationTooltips: ["home", "biography", "news", "work"],
    anchors: ["home", "biography", "news", "work"],
    menu: "#myMenu",
    fitToSection: false,

    afterLoad: function (anchorLink, index) {
      var loadedSection = $(this);

      updateHeaderForScroll();

      //using index
      if (index == 2) {
        /* animate skill bars */
        $(".skillbar").each(function () {
          $(this)
            .find(".skillbar-bar")
            .animate(
              {
                width: $(this).attr("data-percent")
              },
              2500
            );
        });
      }
    }
  });

  updateHomeShrink();

  var newsCarouselTargetScroll = null;

  var getNewsCarouselMetrics = function () {
    var list = $(".news-list");
    var firstItem = list.find(".news-item").first();

    if (!list.length || !firstItem.length) {
      return null;
    }

    var gap = parseFloat(list.css("column-gap")) || parseFloat(list.css("gap")) || 0;
    var step = firstItem.outerWidth() + gap;
    var maxScroll = Math.max(0, list[0].scrollWidth - list.outerWidth());

    if (!step) {
      return null;
    }

    return {
      list: list,
      step: step,
      maxScroll: maxScroll
    };
  };

  var updateNewsCarouselButtons = function () {
    var metrics = getNewsCarouselMetrics();
    var list = metrics && metrics.list;
    var maxScroll = 0;
    var currentScroll = 0;
    var canScrollLeft = false;
    var canScrollRight = false;

    if (list && list.length) {
      maxScroll = metrics.maxScroll;
      currentScroll = newsCarouselTargetScroll == null ? list.scrollLeft() : newsCarouselTargetScroll;
      canScrollLeft = currentScroll > 1;
      canScrollRight = currentScroll < maxScroll - 1;
    }

    $(".news-arrow-left")
      .prop("disabled", !canScrollLeft)
      .attr("aria-disabled", canScrollLeft ? "false" : "true")
      .toggleClass("is-disabled", !canScrollLeft);

    $(".news-arrow-right")
      .prop("disabled", !canScrollRight)
      .attr("aria-disabled", canScrollRight ? "false" : "true")
      .toggleClass("is-disabled", !canScrollRight);
  };

  var loadMoreNewsIfNeeded = function (scrollPosition) {
    var metrics = getNewsCarouselMetrics();
    var list = metrics && metrics.list;

    if (!list || !list.length || !window.loadMoreNewsItems) {
      return false;
    }

    var maxScroll = metrics.maxScroll;
    var position = scrollPosition == null ? list.scrollLeft() : scrollPosition;
    var nearEnd = position >= maxScroll - 2;

    return nearEnd ? window.loadMoreNewsItems() : false;
  };

  var moveNewsCarousel = function (direction) {
    var metrics = getNewsCarouselMetrics();

    if (!metrics) {
      return;
    }

    var list = metrics.list;
    var baseScroll = newsCarouselTargetScroll == null ? list.scrollLeft() : newsCarouselTargetScroll;

    if (direction > 0) {
      loadMoreNewsIfNeeded(baseScroll);
      metrics = getNewsCarouselMetrics();
      if (!metrics) {
        return;
      }
    }

    list = metrics.list;
    var currentIndex = Math.round(baseScroll / metrics.step);
    var nextScroll = Math.max(0, Math.min(metrics.maxScroll, (currentIndex + direction) * metrics.step));

    newsCarouselTargetScroll = nextScroll;
    updateNewsCarouselButtons();

    list.stop().animate(
      {
        scrollLeft: nextScroll
      },
      300,
      function () {
        newsCarouselTargetScroll = null;
        updateNewsCarouselButtons();
      }
    );
  };

  $(document).on("click", ".news-arrow-left", function () {
    moveNewsCarousel(-1);
  });

  $(document).on("click", ".news-arrow-right", function () {
    moveNewsCarousel(1);
  });

  $(".news-list").on("scroll", function () {
    loadMoreNewsIfNeeded();
    if (newsCarouselTargetScroll == null) {
      updateNewsCarouselButtons();
    }
  });
  $(window).on("resize personal-page-newschange", function () {
    newsCarouselTargetScroll = null;
    $(".news-list").stop();
    updateNewsCarouselButtons();
  });
  window.addEventListener("personal-page-newschange", function () {
    updateNewsCarouselButtons();
  });
  updateNewsCarouselButtons();

  $(".work-patent-meta").each(function () {
    var meta = $(this);
    var visibleCount = 0;

    meta.children("div").each(function () {
      var row = $(this);
      var value = $.trim(row.find("dd").text());
      var isEmpty = value === "" || value === "-";

      row.toggleClass("is-empty", isEmpty);

      if (!isEmpty) {
        visibleCount += 1;
      }
    });

    meta.toggleClass("is-empty", visibleCount === 0);
    meta.closest(".work-item").toggleClass("has-empty-patent-meta", visibleCount === 0);
  });

  var animateVisibleWorkItems = function () {
    $(".work-item:not(.is-hidden)").each(function (index) {
      var item = $(this);

      item
        .removeClass("work-tab-in")
        .css("animation-delay", 0.05 + index * 0.06 + "s");

      window.setTimeout(function () {
        item.addClass("work-tab-in");
      }, 20);
    });
  };

  var applyWorkFilter = function (filter, animate) {
    var visibleCount = 0;

    $(".work-item").each(function () {
      var isVisible = $(this).data("work-category") === filter;
      $(this)
        .toggleClass("is-hidden", !isVisible)
        .removeClass("work-tab-in");

      if (isVisible) {
        visibleCount += 1;
      }
    });

    $(".work-empty").toggleClass("is-visible", visibleCount === 0);

    if (animate) {
      animateVisibleWorkItems();
    }
  };

  $(document).on("click", ".work-filter", function () {
    var filter = $(this).data("work-filter");

    $(".work-filter").removeClass("is-active");
    $(this).addClass("is-active");
    applyWorkFilter(filter, true);
  });

  applyWorkFilter($(".work-filter.is-active").data("work-filter") || "publications", false);

  };

  if (window.siteContentReady && window.siteContentReady.then) {
    window.siteContentReady.then(initializePage).catch(initializePage);
  } else {
    initializePage();
  }
});
