<?php

namespace Crealoz\HyvaTranslations\Block;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Framework\View\DesignInterface;
use Magento\Framework\View\Element\Template;
use Crealoz\HyvaTranslations\Model\Js\DataProvider;

class HyvaTranslations extends Template
{
    private const CACHE_TAG = 'HYVA_TRANSLATIONS_CACHE';

    public function __construct(
        Template\Context                        $context,
        private readonly DataProvider           $jsDataProvider,
        private readonly Json                   $jsonSerializer,
        private readonly CacheInterface         $cache,
        private readonly DesignInterface        $design,
        array                                   $data = []
    ) {
        parent::__construct($context, $data);
    }

    /**
     * Get the default Hyva theme translations as a JSON string.
     *
     * @return string JSON string of the default Hyva theme translations.
     */
    public function getHyvaDefaultTranslationsJson(): string
    {
        $currentTheme = $this->design->getDesignTheme();

        $designCacheKey = self::CACHE_TAG . '_' . $currentTheme->getId();

        $cachedTranslations = $this->cache->load($designCacheKey);
        if ($cachedTranslations !== false) {
            return $cachedTranslations;
        }

        if (method_exists($currentTheme, 'getFullPath')) {
            $fullPath = $currentTheme->getFullPath();
        } else {
            $fullPath = (string)($this->getData('theme_full_path') ?: 'frontend/Hyva/default');
        }

        try {
            $dictionary = $this->jsDataProvider->getData($fullPath);
        } catch (LocalizedException|\Exception $e) {
            return '{}';
        }

        $translationsJson = $this->jsonSerializer->serialize($dictionary);
        $this->cache->save($translationsJson, $designCacheKey, [$designCacheKey], 86400); // Cache for 1 day
        return $translationsJson;
    }
}
