import { Component, createSignal, onMount, createEffect, onCleanup } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { camera } from '../babylon/scene';
import { Slider } from "@kobalte/core/slider";
import './ZoomControl.css';

/**
 * Zoom Control Component
 * Provides a vertical slider to control camera zoom distance
 */
export const ZoomControl: Component = () => {
  const [zoomValue, setZoomValue] = createSignal([25]); // 0-100 range
  const [isDragging, setIsDragging] = createSignal(false);

  // Store the current camera distance center for bounds calculation
  const [currentCenterDistance, setCurrentCenterDistance] = createSignal(20);
  const [min, setMin] = createSignal(10);
  const [max, setMax] = createSignal(50);

  // Calculate actual camera distance from slider value
  const getCameraDistanceFromSlider = (value: number) => {
    const centerDist = currentCenterDistance();
    const lowerBound = Math.max(5, centerDist * 0.5);
    const upperBound = centerDist * 2;

    return lowerBound + (upperBound - lowerBound) * (value / 100);
  };

  // Calculate slider value from camera distance
  const getSliderValueFromDistance = (distance: number) => {
    const centerDist = currentCenterDistance();
    const lowerBound = Math.max(5, centerDist * 0.5);
    const upperBound = centerDist * 2;

    return Math.min(100, Math.max(0, ((distance - lowerBound) / (upperBound - lowerBound)) * 100));
  };

  onMount(() => {
    const distance = camera?.radius ?? 25;
    setCurrentCenterDistance(distance);
    setMin(Math.max(5, distance * 0.5));
    setMax(distance * 2);
  });

  // Handle camera distance changes from scene
  const handleCameraDistanceChange = (distanceArr: number[]) => {
    const distance = distanceArr[0];
    console.debug(`[ZOOM] Camera distance changed to ${distance}, updating zoom control`);

    // Set the new center distance
    setCurrentCenterDistance(distance);

    // Update slider position
    //const sliderValue = getSliderValueFromDistance(distance);
    setZoomValue([distance]);
  };

  // Update camera radius when slider changes
  createEffect(() => {
    if (camera && !isDragging()) {
      const distance = zoomValue()[0];
      camera.radius = distance;
    }
  });

  // update slider when datastore state changes (from node changes)
  createEffect(() => {
    const cameraStartDistance = dataStore.state.cameraStartDistance;
    setZoomValue([cameraStartDistance]);
    setMin(Math.max(5, cameraStartDistance * 0.5));
    setMax(cameraStartDistance * 2);
    console.debug('[ZOOM] Camera start distance is now ', cameraStartDistance);
  });


  return (
    <div class="fixed top-4 left-4 z-50 flex flex-col items-center gap-2 mt-48">
      <div class="flex flex-col items-center gap-1">
        {/* <div class="text-xs text-gray-300 w-16 text-center">{max()}</div> */}

        <Slider class="SliderRoot" orientation="vertical"
            value={zoomValue()}
            onChange={handleCameraDistanceChange}
            // onChange={(v) => {
            //   console.log("dragging:", v);
            // }}
            // onChangeEnd={(v) => {
            //   handleCameraDistanceChange(v);
            //   console.log("final value:", v);
            // }}
            minValue={min()}
            maxValue={max()}
            inverted={true}
        >
          <div class=" text-sm text-gray-300 text-center">
            <Slider.Label class="text-white font-medium text-sm mb-2">Zoom</Slider.Label>
            {/* <Slider.ValueLabel /> */}
          </div>
          <Slider.Track class="SliderTrack mb-2 mt-2">
            <Slider.Fill class="SliderRange" />
            <Slider.Thumb class="SliderThumb">
              <Slider.Input />
            </Slider.Thumb>
          </Slider.Track>
        </Slider>
        {/* <div class="text-xs text-gray-300 w-16 text-center">{min()}</div> */}
      </div>

    </div>
  );
};