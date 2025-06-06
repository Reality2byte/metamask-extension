const { strict: assert } = require('assert');
const { Key } = require('selenium-webdriver');
const {
  withFixtures,
  openDapp,
  DAPP_URL,
  DAPP_ONE_URL,
  unlockWallet,
  switchToNotificationWindow,
  WINDOW_TITLES,
} = require('../helpers');
const FixtureBuilder = require('../fixture-builder');

describe('Switch Ethereum Chain for two dapps', function () {
  it('switches the chainId of two dapps when switchEthereumChain of one dapp is confirmed', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withNetworkControllerDoubleNode()
          .build(),
        dappOptions: { numberOfDapps: 2 },
        localNodeOptions: [
          {
            type: 'anvil',
          },
          {
            type: 'anvil',
            options: {
              blockTime: 2,
              vmErrorsOnRPCResponse: false,
              mnemonic:
                'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent',
              port: 8546,
              chainId: 1338,
            },
          },
        ],
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);
        // open two dapps
        const dappOne = await openDapp(driver, undefined, DAPP_URL);
        const dappTwo = await openDapp(driver, undefined, DAPP_ONE_URL);

        // switchEthereumChain request
        const switchEthereumChainRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x53a' }],
        });

        // Initiate switchEthereumChain on Dapp Two
        await driver.executeScript(
          `window.ethereum.request(${switchEthereumChainRequest})`,
        );

        // Confirm switchEthereumChain
        await switchToNotificationWindow(driver, 4);
        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });
        await driver.clickElement({ text: 'Confirm', tag: 'button' });

        // Switch to Dapp One
        await driver.switchToWindow(dappOne);
        assert.equal(await driver.getCurrentUrl(), `${DAPP_URL}/`);

        // Wait for chain id element to change, there's a page reload.
        await driver.waitForSelector({
          css: '#chainId',
          text: '0x53a',
        });

        // Dapp One ChainId assertion
        await driver.findElement({ css: '#chainId', text: '0x53a' });

        // Switch to Dapp Two
        await driver.switchToWindow(dappTwo);
        assert.equal(await driver.getCurrentUrl(), `${DAPP_ONE_URL}/`);

        // Dapp Two ChainId Assertion
        await driver.findElement({ css: '#chainId', text: '0x53a' });
      },
    );
  });

  it('queues switchEthereumChain request from second dapp after send tx request', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withNetworkControllerDoubleNode()
          .build(),
        dappOptions: { numberOfDapps: 2 },
        localNodeOptions: [
          {
            type: 'anvil',
          },
          {
            type: 'anvil',
            options: {
              blockTime: 2,
              vmErrorsOnRPCResponse: false,
              mnemonic:
                'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent',
              port: 8546,
              chainId: 1338,
            },
          },
        ],
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // disable smart transactions step by step
        // we cannot use fixtures because migration 135 overrides the opt in value to true
        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );
        await driver.clickElement({ text: 'Settings', tag: 'div' });
        await driver.clickElement({
          text: 'Advanced',
          tag: 'div',
        });
        const stxToggle = await driver.findElement(
          '[data-testid="settings-page-stx-opt-in-toggle"]',
        );
        stxToggle.sendKeys(Key.ENTER);

        // open two dapps
        await openDapp(driver, undefined, DAPP_URL);
        await openDapp(driver, undefined, DAPP_ONE_URL);

        await driver.findClickableElement({ text: 'Connect', tag: 'button' });
        await driver.clickElement('#connectButton');

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        await driver.clickElementAndWaitForWindowToClose({
          text: 'Connect',
          tag: 'button',
        });

        // Switch to Dapp One and connect it
        await driver.switchToWindowWithUrl(DAPP_URL);
        await driver.findClickableElement({
          text: 'Connect',
          tag: 'button',
        });
        await driver.clickElement('#connectButton');

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        const permissionsTab = await driver.findElement(
          '[data-testid="permissions-tab"]',
        );
        await permissionsTab.click();

        const editButtons = await driver.findElements('[data-testid="edit"]');

        await editButtons[1].click();

        // Disconnect Localhost 8545
        await driver.clickElement({
          text: 'Localhost 8545',
          tag: 'p',
        });

        await driver.clickElement('[data-testid="connect-more-chains-button"]');

        await driver.clickElementAndWaitForWindowToClose({
          text: 'Connect',
          tag: 'button',
        });

        // Switch to Dapp Two
        await driver.switchToWindowWithUrl(DAPP_ONE_URL);
        // Initiate send transaction on Dapp two
        await driver.clickElement('#sendButton');
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });

        // Switch to Dapp One
        await driver.switchToWindowWithUrl(DAPP_URL);

        // Switch Ethereum chain request
        const switchEthereumChainRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }],
        });

        // Initiate switchEthereumChain on Dapp One
        await driver.executeScript(
          `window.ethereum.request(${switchEthereumChainRequest})`,
        );
        await switchToNotificationWindow(driver, 4);
        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });
        await driver.clickElement({
          text: 'Confirm',
          tag: 'button',
        });
        // Delay here after notification for second notification popup for switchEthereumChain
        await driver.delay(1000);

        // Switch and confirm to queued notification for switchEthereumChain
        await switchToNotificationWindow(driver, 4);

        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });
        await driver.clickElementAndWaitForWindowToClose({
          text: 'Confirm',
          tag: 'button',
        });
        await driver.switchToWindowWithUrl(DAPP_URL);
        await driver.findElement({ css: '#chainId', text: '0x539' });
      },
    );
  });

  it('queues send tx after switchEthereum request with a warning, if switchEthereum request is cancelled should show pending tx', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withNetworkControllerDoubleNode()
          .build(),
        dappOptions: { numberOfDapps: 2 },
        localNodeOptions: [
          {
            type: 'anvil',
          },
          {
            type: 'anvil',
            options: {
              blockTime: 2,
              vmErrorsOnRPCResponse: false,
              mnemonic:
                'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent',
              port: 8546,
              chainId: 1338,
            },
          },
        ],
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // open two dapps
        const dappTwo = await openDapp(driver, undefined, DAPP_ONE_URL);
        const dappOne = await openDapp(driver, undefined, DAPP_URL);

        // Connect Dapp One
        await driver.findClickableElement({ text: 'Connect', tag: 'button' });
        await driver.clickElement('#connectButton');

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        await driver.clickElementAndWaitForWindowToClose({
          text: 'Connect',
          tag: 'button',
        });

        // Switch and connect Dapp Two
        await driver.switchToWindow(dappTwo);
        assert.equal(await driver.getCurrentUrl(), `${DAPP_ONE_URL}/`);

        await driver.findClickableElement({ text: 'Connect', tag: 'button' });
        await driver.clickElement('#connectButton');

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        const permissionsTab = await driver.findElement(
          '[data-testid="permissions-tab"]',
        );
        await permissionsTab.click();

        const editButtons = await driver.findElements('[data-testid="edit"]');

        // Click the edit button for networks
        await editButtons[1].click();

        // Disconnect Mainnet
        await driver.clickElement({
          text: 'Localhost 8545',
          tag: 'p',
        });

        await driver.clickElement('[data-testid="connect-more-chains-button"]');
        await driver.clickElementAndWaitForWindowToClose({
          text: 'Connect',
          tag: 'button',
        });
        await driver.switchToWindow(dappTwo);
        assert.equal(await driver.getCurrentUrl(), `${DAPP_ONE_URL}/`);

        // switchEthereumChain request
        const switchEthereumChainRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }],
        });

        // Initiate switchEthereumChain on Dapp Two
        await driver.executeScript(
          `window.ethereum.request(${switchEthereumChainRequest})`,
        );

        // Switch to notification of switchEthereumChain
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });

        // Switch back to dapp one
        await driver.switchToWindow(dappOne);
        assert.equal(await driver.getCurrentUrl(), `${DAPP_URL}/`);

        // Initiate send tx on dapp one
        await driver.clickElement('#sendButton');
        await driver.delay(2000);

        // Switch to notification that should still be switchEthereumChain request but with an warning.
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        // Cancel switchEthereumChain with queued pending tx
        await driver.clickElement({ text: 'Cancel', tag: 'button' });

        // Delay for second notification of the pending tx
        await driver.delay(1000);

        // Switch to new pending tx notification
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await driver.findElement({
          text: 'Transfer request',
          tag: 'h3',
        });

        await driver.findElement({
          text: '0 ETH',
          tag: 'h2',
        });

        // Confirm pending tx
        await driver.findClickableElements({
          text: 'Confirm',
          tag: 'button',
        });
        await driver.clickElement({
          text: 'Confirm',
          tag: 'button',
        });
      },
    );
  });

  describe('There are pending confirmation in the old network', function () {
    it('show alerts on permission network if user does not have permission on new network', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleNode()
            .withPermissionControllerConnectedToTestDappWithChains(['0x539'])
            .build(),
          dappOptions: { numberOfDapps: 2 },
          localNodeOptions: [
            {
              type: 'anvil',
            },
            {
              type: 'anvil',
              options: {
                blockTime: 2,
                vmErrorsOnRPCResponse: false,
                mnemonic:
                  'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent',
                port: 8546,
                chainId: 1338,
              },
            },
          ],
          title: this.test.fullTitle(),
        },
        async ({ driver }) => {
          await unlockWallet(driver);

          await openDapp(driver);

          await driver.clickElement('#personalSign');

          // switchEthereumChain request
          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x53a' }],
          });

          // Initiate switchEthereumChain on the Dapp
          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

          await driver.clickElement(
            '[data-testid="confirm-nav__next-confirmation"]',
          );

          // User reviews pending alerts
          await driver.clickElement({ text: 'Confirm', tag: 'button' });
          await driver.clickElement(
            '[data-testid="alert-modal-action-showPendingConfirmation"]',
          );

          // user confirms permissions
          await driver.clickElement(
            '[data-testid="confirm-nav__next-confirmation"]',
          );
          await driver.clickElement({ text: 'Confirm', tag: 'button' });
          await driver.clickElement('[data-testid="alert-modal-button"]');

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          // Wait for chain id element to change, there's a page reload.
          await driver.waitForSelector({
            css: '#chainId',
            text: '0x53a',
          });
        },
      );
    });

    it('show alerts on switch network page if user does has permission on new network', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleNode()
            .withPermissionControllerConnectedToTestDappWithChains([
              '0x539',
              '0x53a',
            ])
            .build(),
          dappOptions: { numberOfDapps: 2 },
          localNodeOptions: [
            {
              type: 'anvil',
            },
            {
              type: 'anvil',
              options: {
                blockTime: 2,
                vmErrorsOnRPCResponse: false,
                mnemonic:
                  'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent',
                port: 8546,
                chainId: 1338,
              },
            },
          ],
          title: this.test.fullTitle(),
        },
        async ({ driver }) => {
          await unlockWallet(driver);

          await openDapp(driver);

          await driver.clickElement('#personalSign');

          // switchEthereumChain request
          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x53a' }],
          });

          // Initiate switchEthereumChain on the Dapp
          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

          await driver.clickElement(
            '[data-testid="confirm-nav__next-confirmation"]',
          );

          // User reviews pending alerts
          await driver.clickElement({
            text: 'Switch network',
            tag: 'button',
          });
          await driver.clickElement(
            '[data-testid="alert-modal-action-showPendingConfirmation"]',
          );

          // user confirms permissions
          await driver.clickElement(
            '[data-testid="confirm-nav__next-confirmation"]',
          );
          await driver.clickElement({
            text: 'Switch network',
            tag: 'button',
          });
          await driver.clickElement('[data-testid="alert-modal-button"]');

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          // Wait for chain id element to change, there's a page reload.
          await driver.waitForSelector({
            css: '#chainId',
            text: '0x53a',
          });
        },
      );
    });
  });
});
