/** The name of the class used to hide the pseudo element `:before` on Azure */
const HIDE_PSEUDO_CLASS = 'hide-pseudo';
let hasAddedAzureStyle = false;

const azureConfig = {
  domain: 'dev.azure.com',
  selectors: {
    row: 'table.bolt-table tbody > a',
    filename: 'table.bolt-table tbody > a > td[aria-colindex="1"] span.text-ellipsis',
    icon: 'td[aria-colindex="1"] span.icon-margin',
  },
  getIsLightTheme: () =>
    document.defaultView.getComputedStyle(document.body).getPropertyValue('color') ===
    'rgba(0, 0, 0, 0.9)', // TODO: There is probably a better way to determine whether Azure is in light mode
  getIsDirectory: ({ icon }) => icon.classList.contains('repos-folder-icon'),
  getIsSubmodule: () => false, // There appears to be no way to tell if a folder is a submodule
  getIsSymlink: ({ icon }) => icon.classList.contains('ms-Icon--PageArrowRight'),
  replaceIcon: (svgEl, newSVG) => {
    newSVG.style.display = 'inline-flex';
    newSVG.style.height = '1rem';
    newSVG.style.width = '1rem';

    if (!svgEl.classList.contains(HIDE_PSEUDO_CLASS)) {
      svgEl.classList.add(HIDE_PSEUDO_CLASS);
    }

    // Instead of replacing the child icon, add the new icon as a child,
    // otherwise Azure DevOps crashes when you navigate through the repository
    if (svgEl.hasChildNodes()) {
      svgEl.replaceChild(newSVG, svgEl.firstChild);
    } else {
      svgEl.appendChild(newSVG);
    }
  },
  onAdd: (row, callback) => {
    // Mutation observer is required for azure to work properly because the rows are not removed
    // from the page when navigating through the repository.  Without this the page will render
    // fine initially but any subsequent changes will reult in inaccurate icons.
    const mutationCallback = (mutationsList) => {
      // Check whether the mutation was made by this extension
      // this is determined by whether there is an image node added to the dom
      const isExtensionMutation = mutationsList.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => node.nodeName === 'IMG')
      );

      // If the mutation was not caused by the extension, run the icon replacement
      // otherwise there will be an infinite loop
      if (!isExtensionMutation) {
        callback();
      }
    };

    const observer = new MutationObserver(mutationCallback);
    observer.observe(row, { attributes: true, childList: true, subtree: true });

    if (!hasAddedAzureStyle) {
      // Azure requires the icon element to be left on the page so add a style rule to hide its icon
      document.styleSheets[0].insertRule(
        `.${HIDE_PSEUDO_CLASS}::before { display: none !important }`,
        0
      );
      // but only add the style once
      hasAddedAzureStyle = true;
    }
  },
};

export default azureConfig;
