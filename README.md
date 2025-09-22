# hyva-translations

## Description

`HyvaTranslations` is a Magento 2 module that extends the JS translation pipeline for Hyvä themes: collects translations from `.js` and `.phtml`, merges CSV translation files, and exposes a ready-to-use JS dictionary for the `$t` function on the frontend (compatible with Alpine/Hyvä).

## Installation

1. Add the dependency via Composer:

   ```bash
   composer require crealoz/hyva-translations
   ```

2. Enable the module:

   ```bash
   bin/magento module:enable Crealoz_HyvaTranslations
   bin/magento setup:upgrade
   ```

## Configuration

No additional configuration is required. The module uses Magento and Hyvä’s default directories.

## Usage

Translations are automatically collected and exposed in `i18n/js-translation.json`. To use the `$t` function in your components:

```js
$t('Your text to translate');
```

Or in an Alpine template:

```html
<span x-text="$t('Text to translate')"></span>
```

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Submit a pull request.

## License

MIT
