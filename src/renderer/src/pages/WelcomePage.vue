<template>
  <div class="h-full w-full flex flex-col window-drag-region">
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <!-- Logo -->
      <div class="mb-5">
        <img src="@/assets/logo-dark.png" class="w-16 h-16" loading="lazy" />
      </div>

      <!-- Heading -->
      <h1 class="text-3xl font-semibold text-foreground mb-2">
        {{ t('welcome.page.title') }}
      </h1>
      <p class="text-sm text-muted-foreground text-center max-w-md mb-8">
        {{ t('welcome.page.description') }}
      </p>

      <!-- Custom provider form -->
      <form class="w-full max-w-sm space-y-4" @submit.prevent="onVerify">
        <!-- Name -->
        <div class="space-y-1.5">
          <Label for="name" class="text-xs text-foreground/80">
            {{ t('welcome.page.form.name') }}
          </Label>
          <Input
            id="name"
            v-model="formData.name"
            :placeholder="t('welcome.page.form.namePlaceholder')"
            required
          />
        </div>

        <!-- API Type -->
        <div class="space-y-1.5">
          <Label for="apiType" class="text-xs text-foreground/80">
            {{ t('welcome.page.form.apiType') }}
          </Label>
          <Select v-model="formData.apiType" required>
            <SelectTrigger>
              <SelectValue :placeholder="t('welcome.page.form.apiTypePlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="openai-completions">OpenAI Completions</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- API Key -->
        <div class="space-y-1.5">
          <Label for="apiKey" class="text-xs text-foreground/80">
            {{ t('welcome.page.form.apiKey') }}
          </Label>
          <Input
            id="apiKey"
            v-model="formData.apiKey"
            type="password"
            :placeholder="t('welcome.page.form.apiKeyPlaceholder')"
            :required="formData.apiType !== 'ollama'"
          />
        </div>

        <!-- Base URL -->
        <div class="space-y-1.5">
          <Label for="baseUrl" class="text-xs text-foreground/80">
            {{ t('welcome.page.form.baseUrl') }}
          </Label>
          <Input
            id="baseUrl"
            v-model="formData.baseUrl"
            :placeholder="t('welcome.page.form.baseUrlPlaceholder')"
            required
          />
        </div>

        <!-- Verify button -->
        <Button type="submit" class="w-full" :disabled="isVerifying">
          <template v-if="isVerifying">
            <Icon icon="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
            {{ t('welcome.page.form.verifying') }}
          </template>
          <template v-else>
            {{ t('welcome.page.form.verifyConnection') }}
          </template>
        </Button>

        <!-- Verification result: success -->
        <div
          v-if="verifyStatus === 'success'"
          class="flex items-center gap-2 text-sm text-green-600"
        >
          <Icon icon="lucide:check-circle" class="w-4 h-4" />
          {{ t('welcome.page.form.verifySuccess') }}
        </div>

        <!-- Verification result: failed (with skip option) -->
        <div v-if="verifyStatus === 'failed'" class="space-y-3">
          <div class="flex items-start gap-2 text-sm text-red-500">
            <Icon icon="lucide:x-circle" class="w-4 h-4 shrink-0 mt-0.5" />
            <span
              >{{ t('welcome.page.form.verifyFailed') }}{{ errorMsg ? `: ${errorMsg}` : '' }}</span
            >
          </div>
          <Button type="button" variant="outline" class="w-full text-xs" @click="onSkipVerify">
            {{ t('welcome.page.form.skipVerify') }}
          </Button>
        </div>

        <!-- Start button -->
        <Button
          type="button"
          variant="default"
          class="w-full"
          :disabled="verifyStatus !== 'success'"
          @click="onStart"
        >
          {{ t('welcome.page.form.startUsing') }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { nanoid } from 'nanoid'
import { usePresenter } from '@/composables/usePresenter'
import { useProviderStore } from '@/stores/providerStore'
import { useModelStore } from '@/stores/modelStore'
import { usePageRouterStore } from '@/stores/ui/pageRouter'
import { Button } from '@shadcn/components/ui/button'
import { Input } from '@shadcn/components/ui/input'
import { Label } from '@shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@shadcn/components/ui/select'
import type { LLM_PROVIDER } from '@shared/presenter'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const configPresenter = usePresenter('configPresenter')
const providerStore = useProviderStore()
const modelStore = useModelStore()
const pageRouter = usePageRouterStore()

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'failed'

const verifyStatus = ref<VerifyStatus>('idle')
const errorMsg = ref('')
const isVerifying = ref(false)
const addedProviderId = ref('')

const formData = ref<LLM_PROVIDER>({
  id: '',
  name: '',
  apiType: 'openai',
  apiKey: '',
  baseUrl: '',
  enable: true
})

// Auto-fill baseUrl for ollama
watch(
  () => formData.value.apiType,
  (newType, oldType) => {
    if (newType === 'ollama') {
      if (!formData.value.baseUrl) {
        formData.value.baseUrl = 'http://localhost:11434'
      }
      formData.value.apiKey = ''
    } else if (oldType === 'ollama' && formData.value.baseUrl === 'http://localhost:11434') {
      formData.value.baseUrl = ''
    }
    verifyStatus.value = 'idle'
    errorMsg.value = ''
  }
)

// Reset verification when form fields change
watch(
  () => [formData.value.name, formData.value.apiKey, formData.value.baseUrl],
  () => {
    if (verifyStatus.value !== 'idle') {
      verifyStatus.value = 'idle'
      errorMsg.value = ''
    }
  }
)

const onVerify = async () => {
  isVerifying.value = true
  verifyStatus.value = 'verifying'
  errorMsg.value = ''

  try {
    if (addedProviderId.value) {
      await providerStore.updateProviderConfig(addedProviderId.value, {
        name: formData.value.name,
        apiType: formData.value.apiType,
        apiKey: formData.value.apiKey,
        baseUrl: formData.value.baseUrl
      })
    } else {
      formData.value.id = nanoid()
      await providerStore.addCustomProvider(formData.value)
      addedProviderId.value = formData.value.id
    }

    // Verify by fetching model list - if models return, connection is good
    await modelStore.refreshProviderModels(addedProviderId.value)
    const providerModels = modelStore.allProviderModels.find(
      (p) => p.providerId === addedProviderId.value
    )
    const hasModels = (providerModels?.models.length ?? 0) > 0

    if (hasModels) {
      verifyStatus.value = 'success'
    } else {
      verifyStatus.value = 'failed'
      errorMsg.value = t('welcome.page.form.noModelsLoaded')
    }
  } catch (e: any) {
    verifyStatus.value = 'failed'
    errorMsg.value = e?.message ?? ''
  } finally {
    isVerifying.value = false
  }
}

const onSkipVerify = () => {
  verifyStatus.value = 'success'
}

const onStart = async () => {
  await configPresenter.setSetting('init_complete', true)
  pageRouter.goToNewThread()

  if (route.name === 'welcome') {
    await router.replace({ name: 'chat' })
  }
}
</script>

<style scoped>
.window-drag-region {
  -webkit-app-region: drag;
}

button,
a,
input,
select,
textarea,
[role='button'] {
  -webkit-app-region: no-drag;
}
</style>
