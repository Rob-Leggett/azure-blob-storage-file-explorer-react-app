/**
 * @jest-environment node
 */
import handler from '@/pages/api/service-status'
import type { NextApiRequest, NextApiResponse } from 'next'

describe('handler', () => {
  it('should return 200 with "ok"', () => {
    const statusMock = jest.fn().mockReturnThis()
    const sendMock = jest.fn()

    const res = {
      status: statusMock,
      send: sendMock,
    } as unknown as NextApiResponse

    handler({} as NextApiRequest, res)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(sendMock).toHaveBeenCalledWith('ok')
  })
})
