<script>
  import { setContext } from "svelte"
  import { dndStore } from "./dndStore"
  import { notifications } from "@budibase/bbui"

  let scrollRef

  const scrollTo = bounds => {
    if (!bounds) {
      return
    }
    const navItemHeight = 32
    const { scrollLeft, scrollTop, offsetHeight } = scrollRef
    let scrollBounds = scrollRef.getBoundingClientRect()
    let newOffsets = {}

    // Calculate left offset
    newOffsets.left = scrollLeft + bounds.left
    if (newOffsets.left === scrollLeft) {
      delete newOffsets.left
    }

    // Calculate top offset
    const offsetY = bounds.top - scrollBounds?.top + scrollTop
    if (offsetY > scrollTop + offsetHeight - 2 * navItemHeight) {
      newOffsets.top = offsetY - offsetHeight + 2 * navItemHeight
    } else if (offsetY < scrollTop + navItemHeight) {
      newOffsets.top = offsetY - navItemHeight
    } else {
      delete newOffsets.top
    }

    // Skip if offset is unchanged
    if (newOffsets.left == null && newOffsets.top == null) {
      return
    }

    // Smoothly scroll to the offset
    scrollRef.scroll({
      ...newOffsets,
      behavior: "smooth",
    })
  }

  // Set scroll context so components can invoke scrolling when selected
  setContext("scroll", {
    scrollTo,
  })

  const onDrop = async () => {
    try {
      await dndStore.actions.drop()
    } catch (error) {
      console.error(error)
      notifications.error("Error saving component")
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  on:scroll
  bind:this={scrollRef}
  on:drop={onDrop}
  on:dragover={e => e.preventDefault()}
  on:dragenter={e => e.preventDefault()}
>
  <slot />
</div>

<style>
  div {
    flex: 1 1 auto;
    overflow: auto;
    height: 0;
  }
</style>
