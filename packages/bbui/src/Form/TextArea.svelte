<script lang="ts">
  import Field from "./Field.svelte"
  import TextArea from "./Core/TextArea.svelte"
  import { createEventDispatcher } from "svelte"
  import type { LabelPosition } from "../types"

  export let value: string | undefined = undefined
  export let label: string | undefined = undefined
  export let labelPosition: LabelPosition = "above"
  export let placeholder: string | undefined = undefined
  export let readonly: boolean = false
  export let disabled: boolean = false
  export let error: string | undefined = undefined
  export let height: number | undefined = undefined
  export let minHeight: number | undefined = undefined
  export let helpText: string | undefined = undefined
  export let updateOnChange: boolean = false

  let textarea: TextArea
  export function focus() {
    textarea.focus()
  }

  export function contents() {
    return textarea.contents()
  }

  const dispatch = createEventDispatcher()
  const onChange = (e: CustomEvent<string>) => {
    value = e.detail
    dispatch("change", e.detail)
  }
</script>

<Field {helpText} {label} {labelPosition} {error}>
  <TextArea
    bind:this={textarea}
    {disabled}
    {readonly}
    {value}
    {placeholder}
    {height}
    {minHeight}
    {updateOnChange}
    on:change={onChange}
    on:keypress
    on:scrollable
  >
    <slot />
  </TextArea>
</Field>
