<?php

namespace Crealoz\HyvaTranslations\Model\Js;

use Magento\Framework\App\State;
use Magento\Framework\App\Utility\Files;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Filesystem\File\ReadFactory;
use Magento\Framework\Phrase\RendererInterface;
use Magento\Translation\Model\Js\DataProviderInterface;

class DataProvider implements DataProviderInterface
{
    public function __construct(
        private readonly State $appState,
        private readonly Files $filesUtility,
        private readonly ReadFactory $fileReadFactory,
        private readonly RendererInterface $translate,
    ) {

    }

    /**
     * Gets translation data for a given theme. Only returns phrases which are actually translated.
     *
     * @param string $themePath The path to the theme
     * @return array A string array where the key is the phrase and the value is the translated phrase.
     * @throws LocalizedException
     */
    public function getData($themePath)
    {
        $areaCode = $this->appState->getAreaCode();

        $files = array_merge(
            $this->filesUtility->getJsFiles('base', $themePath),
            $this->filesUtility->getJsFiles($areaCode, $themePath),
            $this->filesUtility->getPhtmlFiles()
        );

        $dictionary = [];
        foreach ($files as $filePath) {
            $read = $this->fileReadFactory->create($filePath[0], \Magento\Framework\Filesystem\DriverPool::FILE);
            $content = $read->readAll();
            foreach ($this->getPhrases($content) as $phrase) {
                try {
                    $translatedPhrase = $this->translate->render([$phrase], []);
                    if ($phrase != $translatedPhrase) {
                        $dictionary[$phrase] = $translatedPhrase;
                    }
                } catch (\Exception $e) {
                    throw new LocalizedException(
                        __('Error while translating phrase "%s" in file %s.', $phrase, $filePath[0]),
                        $e
                    );
                }
            }
        }

        ksort($dictionary);

        return $dictionary;
    }

    /**
     * Extract phrases from a string.
     *
     * This method looks for common translation function patterns in JavaScript and PHP code,
     * such as $t('string'), __('string'), and $this->__('string'), and extracts the phrases
     * used for translation.
     *
     * @param string $string The input string to search for translation phrases.
     * @return array An array of unique phrases found in the input string.
     */
    protected function getPhrases($string): array
    {
        $found = [];

        if (!is_string($string) || $string === '') {
            return [];
        }

        $patterns = [
            // $t('string') and $t("string")
            "/\\\$t\\s*\\(\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'\\s*(?:,|\\))/mU",
            "/\\\$t\\s*\\(\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*(?:,|\\))/mU",

            // $t(`template literal`)
            "/\\\$t\\s*\\(\\s*`([^`\\\\]*(?:\\\\.[^`\\\\]*)*)`\\s*(?:,|\\))/mU",

            // __('string') or $this->__('string')
            "/(?:__|\\\$this->__)\\s*\\(\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'\\s*(?:,|\\))/mU",
            "/(?:__|\\\$this->__)\\s*\\(\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*(?:,|\\))/mU",
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $string, $matches)) {
                // matches[1] contains captures
                foreach ($matches[1] as $raw) {
                    // Unescape escaped sequences like \' \" \\ and trim whitespace
                    $key = stripcslashes($raw);
                    $key = trim($key);
                    if ($key !== '') {
                        $found[$key] = true;
                    }
                }
            }
        }

        // return unique keys
        return array_keys($found);
    }

}
