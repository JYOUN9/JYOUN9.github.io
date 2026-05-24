(function () {
  var paths = {
    home: "data/home.yaml",
    biography: "data/biography.yaml",
    news: "data/news.yaml",
    work: [
      { key: "publications", path: "data/work/publications.yaml" },
      { key: "patents", path: "data/work/patents.yaml" },
      { key: "projects", path: "data/work/projects.yaml" },
      { key: "awards", path: "data/work/awards.yaml" }
    ]
  };

  var escapeHtml = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  var slugify = function (value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  var renderMarkedText = function (value, className) {
    return escapeHtml(value).replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="' + className + '">$1</strong>'
    ).replace(
      new RegExp('(<strong class="' + className + '">[^<]*)</strong>(\\*)', "g"),
      "$1$2</strong>"
    );
  };

  var renderBiographyText = function (value) {
    return renderMarkedText(value, "bio-highlight");
  };

  var renderWorkMarkedText = function (value) {
    return renderMarkedText(value, "work-highlight");
  };

  var copyText = function (value) {
    var fallbackCopy = function () {
      return new Promise(function (resolve, reject) {
        var textarea = document.createElement("textarea");

        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
          if (document.execCommand("copy")) {
            resolve();
          } else {
            reject(new Error("Copy command failed"));
          }
        } catch (error) {
          reject(error);
        } finally {
          document.body.removeChild(textarea);
        }
      });
    };

    if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
      return window.navigator.clipboard.writeText(value).catch(fallbackCopy);
    }

    return fallbackCopy();
  };

  var handleHomeCopyLink = function (event) {
    var target = event.target;
    var link = target.closest ? target.closest("a[data-copy-email]") : null;

    if (!link) {
      return;
    }

    event.preventDefault();

    copyText(link.getAttribute("data-copy-email") || "").then(function () {
      var label = link.getAttribute("data-label") || link.textContent;

      window.clearTimeout(link.copyFeedbackTimer);
      link.textContent = "Copied";
      link.copyFeedbackTimer = window.setTimeout(function () {
        link.textContent = label;
      }, 1400);
    }).catch(function (error) {
      if (window.console) {
        console.warn(error.message);
      }
    });
  };

  var parseScalar = function (value) {
    if (value == null) {
      return "";
    }

    value = value.trim();

    if (
      (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
    ) {
      return value.slice(1, -1);
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    if (value === "null" || value === "~") {
      return null;
    }

    return value;
  };

  var parseYaml = function (source) {
    var rows = source
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) {
        return line.replace(/\s+#.*$/, "");
      })
      .filter(function (line) {
        return line.trim() !== "" && line.trim().charAt(0) !== "#";
      })
      .map(function (line) {
        var text = line.replace(/^\s+/, "");
        return {
          indent: line.length - text.length,
          text: text
        };
      });

    var index = 0;

    var splitKeyValue = function (text) {
      var separator = text.indexOf(":");
      return {
        key: text.slice(0, separator).trim(),
        value: text.slice(separator + 1).trim()
      };
    };

    var parseBlock = function (indent) {
      if (index >= rows.length) {
        return {};
      }

      if (rows[index].text.indexOf("- ") === 0) {
        return parseArray(indent);
      }

      return parseMap(indent);
    };

    var parseArray = function (indent) {
      var result = [];

      while (
        index < rows.length &&
        rows[index].indent === indent &&
        rows[index].text.indexOf("- ") === 0
      ) {
        var rest = rows[index].text.slice(2).trim();
        index += 1;

        if (rest === "") {
          result.push(index < rows.length ? parseBlock(rows[index].indent) : "");
        } else if (rest.indexOf(":") > -1) {
          var first = splitKeyValue(rest);
          var item = {};

          item[first.key] = first.value === "" && index < rows.length && rows[index].indent > indent
            ? parseBlock(rows[index].indent)
            : parseScalar(first.value);

          if (index < rows.length && rows[index].indent > indent) {
            var child = parseBlock(rows[index].indent);
            Object.keys(child).forEach(function (key) {
              item[key] = child[key];
            });
          }

          result.push(item);
        } else {
          result.push(parseScalar(rest));
        }
      }

      return result;
    };

    var parseMap = function (indent) {
      var result = {};

      while (
        index < rows.length &&
        rows[index].indent === indent &&
        rows[index].text.indexOf("- ") !== 0
      ) {
        var entry = splitKeyValue(rows[index].text);
        index += 1;

        if (entry.value === "" && index < rows.length && rows[index].indent > indent) {
          result[entry.key] = parseBlock(rows[index].indent);
        } else {
          result[entry.key] = parseScalar(entry.value);
        }
      }

      return result;
    };

    return rows.length ? parseBlock(rows[0].indent) : {};
  };

  var loadYaml = function (path) {
    return fetch(path, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(path + " could not be loaded");
        }

        return response.text();
      })
      .then(parseYaml)
      .catch(function (error) {
        if (window.console) {
          console.warn(error.message);
        }

        return null;
      });
  };

  var renderHome = function (data) {
    if (!data) {
      return;
    }

    var template = document.querySelector('.template[data-template="home"]');

    if (!template) {
      return;
    }

    var heading = template.querySelector("h1");
    var contact = template.querySelector(".p");
    var mainLinks = template.querySelector("main .links");
    var socialLinks = template.querySelector(".home-social-links");

    if (heading && data.heading) {
      var headingLines = Array.isArray(data.heading) ? data.heading : [data.heading];

      heading.innerHTML = headingLines
        .map(function (line) {
          if (typeof line === "string") {
            return "<span>" + escapeHtml(line) + "</span>";
          }

          var parts = [];

          if (line.before) {
            parts.push(escapeHtml(line.before));
          }

          if (line.highlight) {
            parts.push("<mark>" + escapeHtml(line.highlight) + "</mark>");
          }

          if (line.after) {
            parts.push(escapeHtml(line.after));
          }

          return (
            "<span>" +
            parts.join(" ") +
            "</span>"
          );
        })
        .join("");
    }

    if (contact && data.contacts) {
      contact.innerHTML = data.contacts
        .map(function (item) {
          return "<span>" + escapeHtml(item) + "</span>";
        })
        .join("");
    }

    if (mainLinks && data.links) {
      if (mainLinks.getAttribute("data-copy-listener") !== "true") {
        mainLinks.setAttribute("data-copy-listener", "true");
        mainLinks.addEventListener("click", handleHomeCopyLink);
      }

      mainLinks.innerHTML = data.links
        .map(function (item) {
          var copyEmail = item.copy_email || "";
          var href = copyEmail ? "mailto:" + copyEmail : item.url || "#";
          var copyAttributes = copyEmail
            ? '" data-copy-email="' +
              escapeHtml(copyEmail) +
              '" data-label="' +
              escapeHtml(item.label || "") +
              '"'
            : '" target="_blank" rel="noopener"';

          return (
            '<a class="link ' +
            escapeHtml(item.color || "") +
            '" href="' +
            escapeHtml(href) +
            '" title="' +
            escapeHtml(item.title || item.label || "") +
            copyAttributes +
            ">" +
            escapeHtml(item.label || "") +
            "</a>"
          );
        })
        .join("");
    }

    if (socialLinks && data.social_links) {
      socialLinks.innerHTML = data.social_links
        .map(function (item) {
          var label = item.label || "";
          var icon = item.icon || "";
          var fallbackIcon = item.fallback_icon || item.fa_icon || "fa-link";

          return (
            '<a class="home-social-link" href="' +
            escapeHtml(item.url || "#") +
            '" title="' +
            escapeHtml(item.title || label) +
            '" aria-label="' +
            escapeHtml(label) +
            '" target="_blank" rel="noopener">' +
            (icon
              ? '<img src="' +
                escapeHtml(icon) +
                '" alt="" onerror="this.outerHTML=&quot;<i class=&#39;fa ' +
                escapeHtml(fallbackIcon) +
                '&#39; aria-hidden=&#39;true&#39;></i>&quot;">'
              : '<i class="fa ' + escapeHtml(fallbackIcon) + '" aria-hidden="true"></i>') +
            "</a>"
          );
        })
        .join("");
    }
  };

  var renderBiography = function (data) {
    var target = document.querySelector(".biography");

    if (!data || !target) {
      return;
    }

    var profile = data.profile || {};
    var details = data.details || {};
    var interests = details.interests || {};
    var education = details.education || {};
    var renderDetailIcon = function (icon, fallback) {
      if (icon && /\.(svg|png|webp|jpe?g)$/i.test(String(icon))) {
        return '<img class="biography-detail-icon" src="' + escapeHtml(icon) + '" alt="" aria-hidden="true">';
      }

      return '<i class="fa ' + escapeHtml(fallback) + '" aria-hidden="true"></i>';
    };

    target.innerHTML =
      '<h1 class="biography-title">' +
      escapeHtml(data.title || "Biography") +
      "</h1>" +
      '<aside class="biography-profile">' +
      '<div class="biography-photo"><img src="' +
      escapeHtml(profile.image || "") +
      '" alt="' +
      escapeHtml(profile.image_alt || "") +
      '"></div>' +
      "<h2>" +
      escapeHtml(profile.name || "") +
      "</h2>" +
      "<p>" +
      escapeHtml(profile.role || "") +
      "</p>" +
      '<div class="experience-timeline" aria-label="Experience">' +
      "<h3>" +
      escapeHtml(data.experience_title || "Experience") +
      "</h3>" +
      (data.experience || [])
        .map(function (item) {
          return (
            '<div class="experience-item"><div class="experience-marker"><span>' +
            escapeHtml(item.year || "") +
            "</span><i></i></div>" +
            '<div class="experience-copy"><strong>' +
            escapeHtml(item.title || "") +
            "</strong><small>" +
            escapeHtml(item.description || "") +
            "</small></div></div>"
          );
        })
        .join("") +
      "</div></aside>" +
      '<main class="biography-content">' +
      (data.body || [])
        .map(function (paragraph) {
          return "<p>" + renderBiographyText(paragraph) + "</p>";
        })
        .join("") +
      '<div class="biography-details"><section><h2>' +
      escapeHtml(interests.title || "Interests") +
      "</h2><ul>" +
      (interests.items || [])
        .map(function (item) {
          var label = typeof item === "string" ? item : item.label || item.title || "";
          var icon = typeof item === "string" ? interests.icon : item.icon || interests.icon;

          return "<li>" + renderDetailIcon(icon, "fa-book") + "<span>" + escapeHtml(label) + "</span></li>";
        })
        .join("") +
      '</ul></section><section><h2>' +
      escapeHtml(education.title || "Education") +
      '</h2><ul class="education-list">' +
      (education.items || [])
        .map(function (item) {
          var icon = item.icon || education.icon;

          return (
            "<li>" +
            renderDetailIcon(icon, "fa-graduation-cap") +
            '<span class="education-school-line">' +
            escapeHtml(item.title || "") +
            (item.year ? ' <small class="education-year-inline">' + escapeHtml(item.year) + "</small>" : "") +
            "</span>" +
            (item.school ? '<small class="education-title-line">' + escapeHtml(item.school) + "</small>" : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul></section></div></main>";
  };

  var getLinkTarget = function (url) {
    return String(url || "").charAt(0) === "#" ? "_self" : "_blank";
  };

  var renderNewsLink = function (url, className, label, content) {
    if (!url) {
      return content;
    }

    return (
      '<a class="' +
      escapeHtml(className) +
      '" href="' +
      escapeHtml(url) +
      '" target="' +
      escapeHtml(getLinkTarget(url)) +
      '" rel="noopener" aria-label="' +
      escapeHtml(label || "Open news item") +
      '">' +
      content +
      "</a>"
    );
  };

  var renderNewsThumb = function (thumb, item) {
    var image = "";
    var alt = "";

    if (typeof thumb === "string") {
      image = thumb;
    } else if (thumb && thumb.image) {
      image = thumb.image;
      alt = thumb.alt || "";
    }

    if (image) {
      return renderNewsLink(
        item.url || item.link,
        "news-thumb-link",
        item.title,
        '<div class="news-thumb"><img src="' +
          escapeHtml(image) +
          '" alt="' +
          escapeHtml(alt) +
          '"></div>'
      );
    }

    return "";
  };

  var newsBatchSize = 10;
  var newsState = {
    items: [],
    renderedCount: 0
  };

  var hasNewsThumb = function (item) {
    return !!(item.thumb && (typeof item.thumb === "string" || item.thumb.image));
  };

  var renderNewsItem = function (item, index) {
    return (
      '<article class="news-item' +
      (hasNewsThumb(item) ? " has-news-thumb" : "") +
      ' wow fadeInUp" data-wow-delay="' +
      escapeHtml(item.delay || "0." + ((index % newsBatchSize) + 2) + "s") +
      '"><strong class="news-category">' +
      escapeHtml(item.category || "") +
      "</strong>" +
      renderNewsThumb(item.thumb, item) +
      "<h2>" +
      renderNewsLink(item.url || item.link, "news-title-link", item.title, escapeHtml(item.title || "")) +
      "</h2><time datetime=\"" +
      escapeHtml(item.date || "") +
      '">' +
      escapeHtml(item.date || "") +
      "</time><p>" +
      escapeHtml(item.body || "") +
      "</p></article>"
    );
  };

  var appendNewsItems = function (count) {
    var list = document.querySelector(".news-list");
    var start = newsState.renderedCount;
    var end = Math.min(newsState.items.length, start + count);

    if (!list || start >= end) {
      return false;
    }

    list.insertAdjacentHTML(
      "beforeend",
      newsState.items
        .slice(start, end)
        .map(function (item, index) {
          return renderNewsItem(item, start + index);
        })
        .join("")
    );
    newsState.renderedCount = end;
    window.dispatchEvent(new CustomEvent("personal-page-newschange"));

    return newsState.renderedCount < newsState.items.length;
  };

  var renderNews = function (data) {
    var title = document.querySelector(".news-heading h1");
    var list = document.querySelector(".news-list");

    if (!data || !list) {
      return;
    }

    if (title) {
      title.textContent = data.title || "News";
    }

    newsState.items = data.items || [];
    newsState.renderedCount = 0;
    list.innerHTML = "";
    appendNewsItems(newsBatchSize);
  };

  window.loadMoreNewsItems = function () {
    return appendNewsItems(newsBatchSize);
  };

  var renderHomeStats = function (groups) {
    var target = document.querySelector(".home-stats");

    if (!target || !groups) {
      return;
    }

    var counts = groups.reduce(function (result, group) {
      result[group.key] = group.data && group.data.items ? group.data.items.length : 0;
      return result;
    }, {});

    target.innerHTML = [
      { label: "Papers", value: counts.publications || 0 },
      { label: "Patents", value: counts.patents || 0 },
      { label: "Honors", value: counts.awards || 0 }
    ]
      .map(function (item) {
        return (
          '<div class="home-stat"><span>' +
          escapeHtml(item.label) +
          "</span><strong>" +
          escapeHtml(item.value) +
          "</strong></div>"
        );
      })
      .join("");
  };

  var renderWorkThumb = function (item, label) {
    if (!item.image && !item.image_slot) {
      return "";
    }

    return (
      '<div class="work-thumb" aria-label="' +
      escapeHtml(item.image_alt || label || "Work image") +
      '">' +
      (item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.image_alt || "") + '">'
        : "") +
      "</div>"
    );
  };

  var renderTags = function (tags) {
    if (!tags || !tags.length) {
      return "";
    }

    return (
      '<ul class="work-tags">' +
      tags
        .map(function (tag) {
          return "<li>" + escapeHtml(tag) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  };

  var getWorkLinkIcon = function (type) {
    var key = String(type || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    var icons = {
      code: "fa-github",
      github: "fa-github",
      home: "fa-home",
      paper: "fa-file-text-o",
      project: "fa-home",
      supp: "fa-file-archive-o",
      supplemental: "fa-file-archive-o",
      website: "fa-home"
    };

    return icons[key] || "fa-link";
  };

  var getWorkLinkType = function (link) {
    var source = link.type || link.label || "link";

    return String(source)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  var getWorkLinkIconSource = function (link, type) {
    var defaults = {
      link: "fig/icon/link.svg",
      paper: "fig/icon/paper.svg",
      supp: "fig/icon/supp.svg",
      supplemental: "fig/icon/supp.svg"
    };

    return link.icon || defaults[type] || type;
  };

  var getWorkLinkUrl = function (link) {
    return link.url || link.link || "";
  };

  var renderWorkLinks = function (links) {
    if (!links) {
      return "";
    }

    var linkList = Array.isArray(links) ? links : [links];

    if (!linkList.length) {
      return "";
    }

    var renderedLinks = linkList
      .filter(function (link) {
        return link && getWorkLinkUrl(link);
      })
      .map(function (link) {
        var href = getWorkLinkUrl(link);
        var type = getWorkLinkType(link);
        var typeClass = getBadgeClass(type);
        var iconSource = getWorkLinkIconSource(link, type);
        var usesImageIcon = /\.(svg|png|webp|jpe?g)$/i.test(String(iconSource));
        var icon = getWorkLinkIcon(type);
        var isFileLink = icon === "fa-file-text-o" || icon === "fa-file-archive-o";
        var target = link.target || (String(href).charAt(0) === "#" ? "_self" : "_blank");

        return (
          '<a class="work-link' +
          typeClass +
          '" href="' +
          escapeHtml(href) +
          '" target="' +
          escapeHtml(target) +
          '" rel="noopener" aria-label="' +
          escapeHtml(link.label || type) +
          '">' +
          (usesImageIcon
            ? '<img class="work-link-icon" src="' +
              escapeHtml(iconSource) +
              '" alt="" aria-hidden="true">'
            : isFileLink
            ? '<span class="work-link-file"><i class="fa ' +
              icon +
              '" aria-hidden="true"></i><span class="work-link-file-label">' +
              escapeHtml(link.label || type) +
              "</span></span>"
            : '<i class="fa ' + icon + '" aria-hidden="true"></i>') +
          "</a>"
        );
      });

    return renderedLinks.length ? '<div class="work-links">' + renderedLinks.join("") + "</div>" : "";
  };

  var renderPatentMeta = function (item) {
    return (
      '<dl class="work-patent-meta"><div><dt>Application No.</dt><dd>' +
      escapeHtml(item.application_no || "") +
      "</dd></div><div><dt>Registration No.</dt><dd>" +
      escapeHtml(item.registration_no || "") +
      "</dd></div></dl>"
    );
  };

  var getBadgeClass = function (badge) {
    var value = String(badge || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return value ? " is-" + value : "";
  };

  var getWorkItemId = function (key, item, index) {
    return item.id || item.anchor || "work-" + key + "-" + (slugify(item.title || item.badge) || index + 1);
  };

  var renderWorkItem = function (key, item, index) {
    var body = "";
    var renderedLinks = "";
    var itemId = getWorkItemId(key, item, index);
    var badge =
      '<span class="work-badge' +
      getBadgeClass(item.badge) +
      '">' +
      escapeHtml(item.badge || "") +
      "</span>";

    if (key === "publications") {
      renderedLinks = renderWorkLinks(item.links || item.link);
      body =
        renderWorkThumb(item, "Publication image") +
        badge +
        '<div class="work-copy"><h2>' +
        escapeHtml(item.title || "") +
        '</h2><p class="work-authors">' +
        renderWorkMarkedText(item.authors || "") +
        '</p><p class="work-venue">' +
        escapeHtml(item.venue || "") +
        "</p>" +
        renderTags(item.tags) +
        "</div>" +
        renderedLinks;
    } else if (key === "patents") {
      renderedLinks = renderWorkLinks(item.links || item.link);
      body =
        badge +
        "<h2>" +
        escapeHtml(item.title || "") +
        '</h2><p class="work-inventors">' +
        renderWorkMarkedText(item.inventors || "") +
        "</p>" +
        renderPatentMeta(item) +
        renderedLinks;
    } else if (key === "projects") {
      renderedLinks = renderWorkLinks(item.links || item.link);
      body =
        badge +
        "<h2>" +
        escapeHtml(item.title || "") +
        '</h2><time class="work-period" datetime="' +
        escapeHtml(item.period || "") +
        '">' +
        escapeHtml(item.period || "") +
        '</time><p class="work-institution">' +
        escapeHtml(item.institution || "") +
        "</p>" +
        renderTags(item.keywords) +
        renderedLinks;
    } else if (key === "awards") {
      renderedLinks = renderWorkLinks(item.links || item.link);
      body =
        renderWorkThumb(item, "Award image") +
        badge +
        '<div class="work-copy"><h2>' +
        escapeHtml(item.title || "") +
        '</h2><time class="work-date" datetime="' +
        escapeHtml(item.date || "") +
        '">' +
        escapeHtml(item.date || "") +
        '</time><p class="work-affiliation">' +
        escapeHtml(item.affiliation || "") +
        '</p><p class="work-description">' +
        escapeHtml(item.body || "") +
        "</p></div>" +
        renderedLinks;
    }

    return (
      '<article class="work-item wow fadeInUp' +
      (renderedLinks ? " has-work-links" : "") +
      '" id="' +
      escapeHtml(itemId) +
      '" data-wow-delay="' +
      escapeHtml("0." + ((index % 4) + 2) + "s") +
      '" data-work-category="' +
      escapeHtml(key) +
      '">' +
      body +
      "</article>"
    );
  };

  var getWorkSortValue = function (item) {
    var candidates = [
      item.sort_date,
      item.date,
      item.year,
      item.period,
      item.venue,
      item.application_date,
      item.registration_date
    ];
    var months = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12
    };

    for (var i = 0; i < candidates.length; i += 1) {
      var value = String(candidates[i] || "").trim();

      if (!value) {
        continue;
      }

      var parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }

      var yearMatch = value.match(/(19|20)\d{2}/g);
      if (yearMatch && yearMatch.length) {
        var year = parseInt(yearMatch[yearMatch.length - 1], 10);
        var lowerValue = value.toLowerCase();
        var month = 12;

        Object.keys(months).some(function (name) {
          if (lowerValue.indexOf(name) > -1) {
            month = months[name];
            return true;
          }

          return false;
        });

        return Date.UTC(year, month - 1, 1);
      }
    }

    return 0;
  };

  var sortWorkItems = function (items) {
    return (items || [])
      .map(function (item, index) {
        return {
          item: item,
          index: index,
          sortValue: getWorkSortValue(item)
        };
      })
      .sort(function (a, b) {
        if (b.sortValue !== a.sortValue) {
          return b.sortValue - a.sortValue;
        }

        return a.index - b.index;
      })
      .map(function (entry) {
        return entry.item;
      });
  };

  var renderWork = function (groups) {
    var filters = document.querySelector(".work-filters");
    var list = document.querySelector(".work-list");
    var empty = document.querySelector(".work-empty");
    var availableGroups = groups.filter(function (group) {
      return group.data;
    });

    if (!filters || !list || !availableGroups.length) {
      return;
    }

    filters.innerHTML = availableGroups
      .map(function (group, index) {
        return (
          '<button class="work-filter' +
          (index === 0 ? " is-active" : "") +
          '" type="button" data-work-filter="' +
          escapeHtml(group.key) +
          '">' +
          escapeHtml(group.data.label || group.key) +
          "</button>"
        );
      })
      .join("");

    list.innerHTML = availableGroups
      .map(function (group) {
        return sortWorkItems(group.data.items)
          .map(function (item, index) {
            return renderWorkItem(group.key, item, index);
          })
          .join("");
      })
      .join("");

    if (empty) {
      empty.textContent = "No items yet.";
    }
  };

  window.siteContentReady = Promise.all([
    loadYaml(paths.home),
    loadYaml(paths.biography),
    loadYaml(paths.news),
    Promise.all(
      paths.work.map(function (entry) {
        return loadYaml(entry.path).then(function (data) {
          return {
            key: entry.key,
            data: data
          };
        });
      })
    )
  ]).then(function (results) {
    renderHome(results[0]);
    renderBiography(results[1]);
    renderNews(results[2]);
    renderHomeStats(results[3]);
    renderWork(results[3]);
  });
})();
