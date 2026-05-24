(function () {
  var storageKey = "personal-page-theme";

  var getToggle = function () {
    return document.getElementById("theme-toggle");
  };

  var syncToggle = function () {
    var toggle = getToggle();
    var isDarkMode = document.documentElement.classList.contains("theme-dark");

    if (!toggle) {
      return;
    }

    toggle.setAttribute("aria-pressed", isDarkMode ? "true" : "false");
    toggle.setAttribute("aria-label", isDarkMode ? "Switch to light mode" : "Switch to dark mode");

    var text = toggle.querySelector(".theme-toggle-text");
    if (text) {
      text.textContent = isDarkMode ? "ON" : "OFF";
    }
  };

  var setTheme = function (theme, silent) {
    var isDarkMode = theme === "dark";

    document.documentElement.classList.toggle("theme-dark", isDarkMode);
    syncToggle();

    try {
      localStorage.setItem(storageKey, isDarkMode ? "dark" : "light");
    } catch (error) {}

    if (!silent) {
      window.dispatchEvent(
        new CustomEvent("personal-page-themechange", {
          detail: {
            theme: isDarkMode ? "dark" : "light"
          }
        })
      );
    }
  };

  var toggleTheme = function () {
    setTheme(document.documentElement.classList.contains("theme-dark") ? "light" : "dark");
  };

  document.addEventListener("click", function (event) {
    var target = event.target.closest ? event.target.closest("#theme-toggle") : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    toggleTheme();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncToggle);
  } else {
    syncToggle();
  }

  window.personalPageTheme = {
    set: setTheme,
    toggle: toggleTheme,
    sync: syncToggle
  };
})();
