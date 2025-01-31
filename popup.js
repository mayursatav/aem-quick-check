// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const domainInput = document.getElementById("domainInput");
  const addDomainButton = document.getElementById("addDomain");
  const domainDropdown = document.getElementById("domainDropdown");
  const openPageProperties = document.getElementById("openPageProperties");
  const openEditorMode = document.getElementById("openEditorMode");
  const showComponents = document.getElementById("showComponents");
  const showExternalLinks = document.getElementById("showExternalLinks");
  const showMissingAltText = document.getElementById("showMissingAltText");

  const showImagePath = document.getElementById("showImagePath");
  const showImageResolution = document.getElementById("showImageResolution");
  const pageDetailsDiv = document.getElementById("details-container");
  const editTemplateButton = document.getElementById("editTemplate");

  // Disable the buttons initially
  openPageProperties.disabled = true;
  openEditorMode.disabled = true;
  editTemplateButton.disabled = true;

// Query the active tab and execute a script to check the conditions
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: () => {
        // Check if the page is an AEM site
        const isAEMSite = document.querySelector(".aem-Grid") !== null;
        const currentPath = window.location.pathname;
        const isAEMPath = currentPath.startsWith("/content/");

        // Return the results
        return { isAEMSite, isAEMPath };
      },
    },
    (results) => {
      if (results && results[0] && results[0].result) {
        const { isAEMSite, isAEMPath } = results[0].result;

        // Get references to tab1, overlay, and content path fields
        const tab1 = document.querySelector("#tab1");
        const overlay = document.getElementById("overlay");
        const contentPathLabel = document.querySelector("label[for='contentPathInput']");
        const contentPathInput = document.getElementById("contentPathInput");

        if (!isAEMSite) {
          pageDetailsDiv.style.display = "none"; 
          // Disable tab1 and show overlay if not an AEM site
          tab1.classList.add("disabled-tab");
          tab1.querySelectorAll("button, input").forEach((element) => {
            element.disabled = true;
          });
          overlay.style.display = "block";
          overlay.textContent = "This is not an AEM site.";
        } else if (!isAEMPath) {
          // If it's an AEM site but not a lower environment, show content path fields
          // openPageProperties.disabled = true;
          // openEditorMode.disabled = true;
          // domainInput.disabled = true;
          // domainDropdown.disabled = true;
          // addDomainButton.disabled = true;
          pageDetailsDiv.style.display = "none"; 
          // Disable tab1 and show overlay if not an AEM site
          tab1.classList.add("disabled-tab");
          tab1.querySelectorAll("button, input").forEach((element) => {
            element.disabled = true;
          });
          overlay.style.display = "block";
          overlay.textContent = "This is not an AEM Author site.";
        }
      }
    }
  );
});


  // Load stored domains on popup load
  chrome.storage.local.get(["aemDomains"], (result) => {
    const domains = result.aemDomains || [];
    populateDropdown(domains);

    // Preselect the last used domain
    chrome.storage.local.get(["selectedDomain"], (res) => {
      if (res.selectedDomain) {
        domainDropdown.value = res.selectedDomain;
      }
    });
  });

  // Handle domain selection
  domainDropdown.addEventListener("change", () => {
    const selectedDomain = domainDropdown.value;

    // Save the selected domain
    chrome.storage.local.set({ selectedDomain }, () => {
      console.log("Selected domain:", selectedDomain);

      // Enable buttons if a valid domain is selected
      openPageProperties.disabled = !selectedDomain;
      openEditorMode.disabled = !selectedDomain;
      editTemplateButton.disabled = !selectedDomain;
    });
  });

  // Populate dropdown with domains
  function populateDropdown(domains) {
    domainDropdown.innerHTML = `<option value="" selected disabled>Select a domain</option>`;
    domains.forEach((domain) => {
      const option = document.createElement("option");
      option.value = domain;
      option.textContent = domain;
      domainDropdown.appendChild(option);
    });
  }

  // Load the selected domain on popup load
  chrome.storage.local.get(["selectedDomain"], (result) => {
    const selectedDomain = result.selectedDomain;
    if (selectedDomain) {
      domainDropdown.value = selectedDomain;
      openPageProperties.disabled = false;
      openEditorMode.disabled = false;
      editTemplateButton.disabled = false;
    }
  });

// Add domain button click
addDomainButton.addEventListener("click", () => {
  const domain = domainInput.value.trim();

  // Validate the domain using a regex pattern
  const domainRegex = /^(https?:\/\/)?((localhost(:\d{1,5})?)|([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,})(:\d{1,5})?$/;

  if (domain && domainRegex.test(domain)) {
    chrome.storage.local.get(["aemDomains"], (result) => {
      const domains = result.aemDomains || [];

      // Normalize the domain by removing http:// or https:// before adding it
      // const normalizedDomain = domain.replace(/^(https?:\/\/)/, '');

      // Add the domain if it's not already in the list
      if (!domains.includes(domains)) {
        domains.push(domain);
        chrome.storage.local.set({ aemDomains: domains }, () => {
          populateDropdown(domains);
          console.log("Domain added:", domain);
        });
      }

      // Clear the input field
      domainInput.value = "";
    });
  } else {
    console.error("Invalid domain:", domain);
    alert("Please enter a valid domain.");
  }
});



  // Listen for input changes in the domain field
  domainInput.addEventListener("input", () => {
    const domain = domainInput.value.trim();

    // Enable buttons if the domain input is not empty
    if (domain) {
      openPageProperties.disabled = false;
      openEditorMode.disabled = false;
      editTemplateButton.disabled = false;
    } else {
      openPageProperties.disabled = true;
      openEditorMode.disabled = true;
      editTemplateButton.disabled = true;
    }
  });

  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  // Tab functionality
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));

      // Add active class to the clicked tab and corresponding content
      tab.classList.add("active");
      document.querySelector(tab.dataset.target).classList.add("active");
    });
  });

  // Fetch AEM Page JSON and display details
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const pageUrl = tabs[0].url;
    const pageJsonUrl = pageUrl.replace(".html", ".1.json");

    fetch(pageJsonUrl)
      .then((response) => response.json())
      .then((data) => {
        const content = data["jcr:content"] || {}; // Access jcr:content

        // Populate details
        pageDetailsDiv.innerHTML = `
        <div class="card mb-1">
  <div class="card-body">
    <div class="row">
      <div class="col-4 fw-bold">Created By</div>
      <div class="col-8 text-truncate">${data["jcr:createdBy"] || content["jcr:createdBy"] || "N/A"}</div>
    </div>
    <div class="row">
      <div class="col-4 fw-bold">Created On</div>
      <div class="col-8 overflow">${data["jcr:created"] || content["jcr:created"] || "N/A"}</div>
    </div>
    <div class="row">
      <div class="col-4 fw-bold">Page Template</div>
      <div class="col-8">${(content["cq:template"] || "N/A").split('/').pop()}</div>
    </div>
  </div>
</div>

<div class="card">
  <div class="card-body">
    <div class="row">
      <div class="col-4 fw-bold">Last Published</div>
      <div class="col-8 overflow">${content["cq:lastRolledout"] || "N/A"}</div>
    </div>
    <div class="row">
      <div class="col-4 fw-bold">Last Modified</div>
      <div class="col-8 overflow">${content["cq:lastModified"] || "N/A"}</div>
    </div>
    <div class="row">
      <div class="col-4 fw-bold">Modified By</div>
      <div class="col-8 text-truncate">${content["cq:lastModifiedBy"] || "N/A"}</div>
    </div>
  </div>
</div>

        `;
      // Enable the Edit Template button if cq:template is available
      const templatePath = content["cq:template"];
      if (templatePath) {
        editTemplateButton.addEventListener("click", () => {
          chrome.storage.local.get(["selectedDomain"], (result) => {
            const selectedDomain = result.selectedDomain?.replace(/\/$/, "");
            if (selectedDomain) {
              const templateEditUrl = `${selectedDomain}/editor.html${templatePath}/structure.html`;
              chrome.tabs.create({ url: templateEditUrl });
            } else {
              alert("Please select a valid AEM domain.");
            }
          });
        });
      } else {
        editTemplateButton.disabled = true;
      }
    })
    .catch((err) => {
      pageDetailsDiv.innerHTML = "Error fetching page details.";
      console.error(err);
      editTemplateButton.disabled = true;
    });
  });


  // Open Page Properties
openPageProperties.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;

    const currentPath = new URL(currentTab.url).pathname;

    // Use the selected domain from the dropdown
    chrome.storage.local.get(["selectedDomain"], (result) => {
      const selectedDomain = result.selectedDomain.replace(/\/$/, '');
      if (!selectedDomain) {
        alert("Please select a valid AEM domain.");
        return;
      }

      const propertiesUrl = `${selectedDomain}/mnt/overlay/wcm/core/content/sites/properties.html?item=${currentPath.replace(/\.html$/, "")}`;
      chrome.tabs.create({ url: propertiesUrl });
    });
  });
});

// Open Editor Mode
openEditorMode.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;

    const currentPath = new URL(currentTab.url).pathname;

    // Use the selected domain from the dropdown
    chrome.storage.local.get(["selectedDomain"], (result) => {
      const selectedDomain = result.selectedDomain.replace(/\/$/, '');
      if (!selectedDomain) {
        alert("Please select a valid AEM domain.");
        return;
      }

      const editorUrl = `${selectedDomain}/editor.html${currentPath}`;
      chrome.tabs.create({ url: editorUrl });
    });
  });
});

// Show Image Path
let isShowingImagePaths = false;
showImagePath.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: (isShowingImagePaths) => {
          const images = document.querySelectorAll("img");
          images.forEach((img) => {
            const label = img.parentElement.querySelector(".image-path-label");

            if (isShowingImagePaths) {
              // Remove the image path label and reset background
              if (label) label.remove();
              img.style.backgroundColor = "";
            } else {
              // Create a span tag to display the image path above the image
              const label = document.createElement("span");
              label.className = "image-path-label";
              label.innerText = img.src;
              label.style.position = "absolute";
              label.style.top = "-20px"; // Position the label above the image
              label.style.left = "0";
              label.style.backgroundColor = "#448ce5";
              label.style.color = "white";
              label.style.padding = "5px";
              label.style.fontSize = "12px";
              label.style.zIndex = "1000";
              label.style.borderRadius = "5px";
              label.style.width = "300px";

              img.style.position = "relative"; // Make sure the label is positioned correctly
              img.parentElement.style.position = "relative"; // Ensure label is correctly aligned with the image
              img.parentElement.appendChild(label);
            }
          });
          return !isShowingImagePaths;
        },
        args: [isShowingImagePaths],
      },
      ([result]) => {
        isShowingImagePaths = result.result;
        console.log(isShowingImagePaths); // Check the current state
      }
    );
  });
});

// Show Rendered Image Size
let isShowingRenderedSizes = false;
showImageResolution.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: (isShowingRenderedSizes) => {
          // Inject CSS class for styling
          if (!document.getElementById("rendered-size-label-style")) {
            const style = document.createElement("style");
            style.id = "rendered-size-label-style";
            style.textContent = `
              .image-rendered-size-label {
                position: absolute !important;
                top: -20px !important;
                left: 0 !important;
                background-color: #ff7000 !important;
                color: white !important;
                padding: 5px !important;
                z-index: 1000 !important;
                border-radius: 5px !important;
                width: auto !important;
                white-space: nowrap !important;
                line-height: 1.3 !important;
                font: bold 12px Arial, sans-serif !important;
              }
            `;
            document.head.appendChild(style);
          }

          const images = document.querySelectorAll("img");

          images.forEach((img) => {
            // Function to create or update the rendered size label
            const updateRenderedSizeLabel = () => {
              const label = img.parentElement.querySelector(".image-rendered-size-label");

              if (isShowingRenderedSizes) {
                // Remove the rendered size label and reset styles
                if (label) label.remove();
                img.style.backgroundColor = "";
              } else {
                // Get the rendered size of the image
                const renderedWidth = img.offsetWidth;
                const renderedHeight = img.offsetHeight;

                // Create a new rendered size label if one doesn't exist
                const renderedSize = `${renderedWidth}px X ${renderedHeight}px`;
                const newLabel = label || document.createElement("span");
                newLabel.className = "image-rendered-size-label";
                newLabel.innerText = renderedSize;

                if (!label) {
                  img.style.position = "relative"; // Ensure proper alignment
                  img.parentElement.style.position = "relative";
                  img.parentElement.appendChild(newLabel);
                }
              }
            };

            // Handle already loaded or lazy-loaded images
            if (img.complete) {
              updateRenderedSizeLabel();
            } else {
              img.onload = updateRenderedSizeLabel;
            }
          });

          return !isShowingRenderedSizes;
        },
        args: [isShowingRenderedSizes],
      },
      ([result]) => {
        isShowingRenderedSizes = result.result;
        console.log(`Is Showing Rendered Sizes: ${isShowingRenderedSizes}`);
      }
    );
  });
});

  // Show Components
let componentsVisible = false;
showComponents.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: (componentsVisible) => {
          const components = document.querySelectorAll("div.aem-GridColumn");
          components.forEach((comp) => {
            if (componentsVisible) {
              // Reset styles and remove labels
              comp.style.position = "";
              comp.querySelector(".component-label")?.remove();
            } else {
              // Add position relative and create the label
              comp.style.position = "relative";
              const label = document.createElement("span");
              label.className = "component-label";
              label.innerText = comp.className.split(" ")[0];
              label.style.position = "absolute";
              label.style.top = "0";
              label.style.left = "0";
              label.style.zIndex = "1000";
              label.style.background = "#789700";
              label.style.color = "white";
              label.style.padding = "2px 5px";
              label.style.fontSize = "13px";
              label.style.borderRadius = "5px"
              label.style.transform = "translateY(-100%)"; // Position above the component
              comp.appendChild(label);
            }
          });
          return !componentsVisible;
        },
        args: [componentsVisible],
      },
      ([result]) => {
        componentsVisible = result.result;
        console.log(componentsVisible);
      }
    );
  });
});

let isHighlightingExternalLinks = false; // Track if external links are highlighted

// Show External Links
showExternalLinks.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: (isHighlightingExternalLinks) => {
          const links = document.querySelectorAll("a");

          links.forEach((link) => {
            try {
              const linkHref = link.getAttribute("href");
              if (!linkHref) return; // Skip links without an href

              const linkUrl = new URL(linkHref, document.baseURI);

              // Define internal and external link conditions
              const isInternal =
                linkUrl.hostname === location.hostname &&
                (linkUrl.pathname.startsWith("/") || linkUrl.pathname.startsWith("/content"));

              // External links are any valid HTTP/HTTPS links not marked as internal
              const isExternal = linkUrl.protocol.startsWith("http") && !isInternal;

              if (isExternal && !isHighlightingExternalLinks) {
                // Highlight external links
                link.classList.add("highlight-external");
                link.style.backgroundColor = "red";
                link.style.color = "white"; // Optional: Set text color for better visibility
                link.style.padding = "3px"; 
                link.style.borderRadius = "5px"; 
              } else if (isExternal && isHighlightingExternalLinks) {
                // Reset the styles for previously highlighted links
                link.classList.remove("highlight-external");
                link.style.backgroundColor = "";
                link.style.color = "";
              }
            } catch (e) {
              console.error("Invalid URL:", link.href, e);
            }
          });

          // Toggle the state of highlighting external links
          return !isHighlightingExternalLinks;
        },
        args: [isHighlightingExternalLinks],
      },
      ([result]) => {
        isHighlightingExternalLinks = result.result;
        console.log("Highlighting external links:", isHighlightingExternalLinks);
      }
    );
  });
});

// Fetch Meta Properties
// Fetch Meta Properties
const pagePropertiesDiv = document.getElementById("pageProperties");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  if (!currentTab?.url) return;

  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: getMetaProperties,
  }, (result) => {
    if (result && result[0].result) {
      const metaProperties = result[0].result;
      // Display the meta properties in the pageProperties div
      pagePropertiesDiv.innerHTML = `
        <table class="meta-properties-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(metaProperties)}
          </tbody>
        </table>
      `;
    } else {
      pagePropertiesDiv.textContent = "No meta properties found.";
    }
  });
});

// Function to extract meta properties
function getMetaProperties() {
  const metaTags = document.getElementsByTagName('meta');
  const metaProperties = {};

  // List of properties we are interested in
  const requiredProps = [
    "og:title",
    "og:type",
    "og:image",
    "og:url",
    "og:description",
    "og:site_name",
    "twitter:title",
    "twitter:image",
    "twitter:description",
    "twitter:url",
    "twitter:card",
    "url",
    "image",
    "description",
    "keywords"
  ];

  for (let tag of metaTags) {
    const name = tag.getAttribute('name') || tag.getAttribute('property');
    const content = tag.getAttribute('content');
    if (name && content && requiredProps.includes(name)) {
      metaProperties[name] = content;
    }
  }

  return metaProperties;
}

// Function to generate table rows dynamically
function generateTableRows(metaProperties) {
  const rows = [
    { label: "og:title", value: metaProperties["og:title"] },
    { label: "og:type", value: metaProperties["og:type"] },
    { label: "og:image", value: metaProperties["og:image"] },
    { label: "og:url", value: metaProperties["og:url"] },
    { label: "og:description", value: metaProperties["og:description"] },
    { label: "og:site_name", value: metaProperties["og:site_name"] },
    { label: "twitter:title", value: metaProperties["twitter:title"] },
    { label: "twitter:image", value: metaProperties["twitter:image"] },
    { label: "twitter:description", value: metaProperties["twitter:description"] },
    { label: "twitter:url", value: metaProperties["twitter:url"] },
    { label: "twitter:card", value: metaProperties["twitter:card"] },
    { label: "url", value: metaProperties["url"] },
    { label: "image", value: metaProperties["image"] },
    { label: "description", value: metaProperties["description"] },
    { label: "keywords", value: metaProperties["keywords"] }
  ];

  return rows.map(row => {
    return `
      <tr>
        <td>${row.label}</td>
        <td class="${!row.value ? 'missing' : ''}">${row.value || 'Missing'}</td>
      </tr>
    `;
  }).join('');
}

const pageStylesDiv = document.getElementById("pageStyles");
const colorListDiv = document.getElementById("colorList");
const fontListDiv = document.getElementById("fontList");
const colorFormatRadio = document.getElementsByName("colorFormat");

  // Function to convert RGB to Hex
  function rgbToHex(rgb) {
    const result = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(rgb);
    if (!result) return rgb;
    return `#${((1 << 24) | (parseInt(result[1]) << 16) | (parseInt(result[2]) << 8) | parseInt(result[3]))
      .toString(16)
      .slice(1)}`;
  }

  // Function to display the colors in either RGB or Hex format
  function displayColors(colors, format) {
    const colorsHtml = colors
      .map((color) => {
        const displayColor = format === 'hex' ? rgbToHex(color) : color;
        return `
          <div style="flex: 0 0 50%; padding: 5px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <div style="width: 20px; height: 20px; background-color: ${color}; margin-right: 10px;"></div>
              <span>${displayColor}</span>
            </div>
          </div>
        `;
      })
      .join("");

      colorListDiv.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
        ${colorsHtml}
      </div>
    ` || "<div>No colors found on this page.</div>";
  }

  // Fetch all colors used in the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab?.url) return;

    chrome.scripting.executeScript(
      {
        target: { tabId: currentTab.id },
        func: () => {
          // Get all elements in the page
          const allElements = document.querySelectorAll("*");
          const colorSet = new Set();

          // Loop through all elements and collect colors
          allElements.forEach((element) => {
            const computedStyle = window.getComputedStyle(element);
            const color = computedStyle.color;
            const backgroundColor = computedStyle.backgroundColor;
            
            // Add colors to the set
            if (color && color !== 'rgba(0, 0, 0, 0)' && !colorSet.has(color)) {
              colorSet.add(color);
            }
            if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && !colorSet.has(backgroundColor)) {
              colorSet.add(backgroundColor);
            }
          });

          // Return the set of colors
          return Array.from(colorSet);
        },
      },
      ([result]) => {
        const colors = result.result;
        console.log("Extracted colors:", colors); // Debugging log

        if (colors && colors.length > 0) {
          // Default to RGB display
          displayColors(colors, 'rgb');

          // Add event listeners for radio buttons to switch color formats
          colorFormatRadio.forEach((radio) => {
            radio.addEventListener("change", () => {
              const format = document.querySelector('input[name="colorFormat"]:checked').value;
              displayColors(colors, format);
            });
          });
        } else {
          colorListDiv.innerHTML = "<div>No colors found on this page.</div>";
        }
      }
    );
  });

   // Show Missing Alt Text for images
   // Show or Hide Missing Alt Text for images
  let missingAltTextVisible = false;
  showMissingAltText.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: (missingAltTextVisible) => {
            const images = document.querySelectorAll("img");
            images.forEach((img) => {
              const label = img.parentElement.querySelector(".alt-text-label");

              if (!missingAltTextVisible && (!img.alt || img.alt.trim() === "")) {
                // Add a label if alt is missing or empty
                const label = document.createElement("span");
                label.className = "alt-text-label";
                label.innerText = "Missing Alt Text";
                label.style.position = "absolute";
                label.style.top = "0";
                label.style.left = "0";
                label.style.zIndex = "1000";
                label.style.background = "red";
                label.style.color = "white";
                label.style.padding = "2px 5px";
                label.style.fontSize = "12px";
                label.style.fontWeight = "bold";
                label.style.transform = "translateY(-100%)"; // Position above the image
                label.style.borderRadius = "5px"; 
                img.style.position = "relative"; // Make sure the label is positioned correctly
                img.parentElement.style.position = "relative"; // Ensure label is correctly aligned with the image
                img.parentElement.appendChild(label);
              } else if (missingAltTextVisible && label) {
                // Remove the label if alt is missing and toggled off
                label.remove();
              }
            });
            return !missingAltTextVisible;
          },
          args: [missingAltTextVisible],
        },
        (result) => {
          missingAltTextVisible = result[0].result;
          // showMissingAltText.textContent = missingAltTextVisible ? "Hide Missing Alt Text" : "Show Missing Alt Text";
        }
      );
    });
  });


  // Fetch all fonts used in the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab?.url) return;

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const allElements = document.querySelectorAll('*');
        const fontSet = new Set();

        allElements.forEach((element) => {
          const computedStyle = window.getComputedStyle(element);
          const fontFamily = computedStyle.fontFamily;

          // Add font family to the set if it's not empty
          if (fontFamily && fontFamily.trim()) {
            fontFamily.split(',').forEach((font) => fontSet.add(font.trim()));
          }
        });

        // Return the set of fonts used on the page
        return Array.from(fontSet);
      },
    }, ([result]) => {
      const fonts = result.result;
      console.log("Fonts used on page:", fonts); // Debugging log

      if (fonts && fonts.length > 0) {
        displayFonts(fonts);
      } else {
        fontListDiv.innerHTML += "<div>No fonts found on this page.</div>";
      }
    });
  });

  // Function to display the fonts used
  function displayFonts(fonts) {
    const fontsHtml = fonts
      .map((font) => {
        return `
          <div style="flex: 1; min-width: 150px; margin-bottom: 5px;">
            <span style="font-family: ${font};">${font.replace(/['"]/g, "")}</span>
          </div>
        `;
      })
      .join("");

    fontListDiv.innerHTML += `
      <div style="display: flex; flex-wrap: wrap;">
        ${fontsHtml}
      </div>
    `;
  }

  // Fetch the manifest.json file
  fetch('manifest.json')
  .then(response => response.json())
  .then(data => {
    // Get the version from the manifest
    const version = data.version;
    
    // Update the HTML element with the new version
    const versionElement = document.getElementById('version');
    versionElement.textContent = `v${version}`;
  })
  .catch(error => {
    console.error('Error loading manifest:', error);
  });

  
});