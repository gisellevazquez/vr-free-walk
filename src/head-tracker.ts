// Detects walking by measuring head position delta per XR frame.
// Threshold of 4mm/frame filters natural head sway while standing.
export class HeadTracker {
  private lx = 0
  private ly = 0
  private lz = 0
  private initialized = false
  private readonly THRESHOLD = 0.004

  update(pose: XRViewerPose): boolean {
    const { x, y, z } = pose.transform.position

    if (!this.initialized) {
      this.lx = x; this.ly = y; this.lz = z
      this.initialized = true
      return false
    }

    const dx = x - this.lx
    const dy = y - this.ly
    const dz = z - this.lz
    this.lx = x; this.ly = y; this.lz = z

    return dx * dx + dy * dy + dz * dz > this.THRESHOLD * this.THRESHOLD
  }

  reset() { this.initialized = false }
}
